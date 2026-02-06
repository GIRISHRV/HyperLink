import type { DataConnection } from "peerjs";
import type { PeerMessage, FileOfferPayload, ChunkPayload, TransferProgress } from "@repo/types";
import { generateTransferId, calculateChunkCount } from "@repo/utils";

const CHUNK_SIZE = 16384; // 16KB (reduced from 64KB for better reliability)

export class FileSender {
  private file: File;
  private connection: DataConnection;
  private transferId: string;
  private totalChunks: number;
  private currentChunk: number = 0;
  private isCancelled: boolean = false;
  private isPaused: boolean = false;
  private bytesSent: number = 0;
  private startTime: number = 0;
  private dbTransferId?: string;
  private progressCallback?: (progress: TransferProgress) => void;
  private rejectTransfer?: (error: Error) => void;
  private resolveTransfer?: () => void;
  private cancelCallback?: () => void;
  private pauseCallback?: (paused: boolean) => void;
  private rejectCallback?: () => void;
  private isTransferring: boolean = false;

  constructor(file: File, connection: DataConnection, dbTransferId?: string) {
    this.file = file;
    this.connection = connection;
    this.transferId = generateTransferId();
    this.totalChunks = calculateChunkCount(file.size, CHUNK_SIZE);
    this.dbTransferId = dbTransferId;
  }

  /**
   * Send file offer to receiver
   */
  async sendOffer(): Promise<string> {
    const offerMessage: PeerMessage<FileOfferPayload> = {
      type: "file-offer",
      transferId: this.transferId,
      payload: {
        filename: this.file.name,
        fileSize: this.file.size,
        fileType: this.file.type,
        totalChunks: this.totalChunks,
        dbTransferId: this.dbTransferId,
      },
      timestamp: Date.now(),
    };

    this.connection.send(offerMessage);
    return this.transferId;
  }
  /**
   * Start ACK-based transfer - waits for receiver to confirm each chunk
   */
  async startTransfer(onProgress?: (progress: TransferProgress) => void): Promise<void> {
    if (this.isTransferring) {
      console.warn("[SENDER] Transfer already in progress, ignoring duplicate call");
      return;
    }

    this.isTransferring = true;
    this.progressCallback = onProgress;
    this.startTime = Date.now();

    return new Promise((resolve, reject) => {
      this.rejectTransfer = reject;
      this.resolveTransfer = resolve;

      console.log("[SENDER] Setting up ACK listener...");

      let transferStarted = false;

      // Listen for ACKs and control messages from receiver
      this.connection.on("data", (data: any) => {
        console.log("[SENDER] Received data:", data?.type);
        const message = data as PeerMessage;

        if (message.transferId !== this.transferId) return;

        // Wait for file-accept before sending first chunk
        if (message.type === "file-accept" && !transferStarted) {
          console.log("[SENDER] Received file-accept, starting transfer...");
          transferStarted = true;
          this.sendNextChunk();
          return;
        }

        if (message.type === "chunk-ack") {
          console.log(`[SENDER] Got ACK for chunk ${(message.payload as any)?.chunkIndex}`);
          // Receiver confirmed chunk, send next one
          this.currentChunk++;

          if (this.isCancelled) return;

          if (this.isPaused) {
            console.log("[SENDER] Transfer paused, waiting for resume...");
            return;
          }

          if (this.currentChunk < this.totalChunks) {
            this.sendNextChunk();
          } else if (this.currentChunk >= this.totalChunks) {
            // All chunks sent and acknowledged
            this.sendComplete();
            this.resolveTransfer?.();
          }
        } else if (message.type === "file-reject") {
          console.log("[SENDER] Receiver rejected the file offer");
          this.isCancelled = true;
          this.rejectCallback?.();
          reject(new Error("File offer rejected by receiver"));
        } else if (message.type === "transfer-cancel") {
          console.log("[SENDER] Receiver cancelled transfer");
          this.isCancelled = true;
          this.cancelCallback?.();
          reject(new Error("Transfer cancelled by receiver"));
        } else if (message.type === "transfer-pause") {
          console.log("[SENDER] Receiver requested pause");
          this.isPaused = true;
          this.pauseCallback?.(true);
        } else if (message.type === "transfer-resume") {
          console.log("[SENDER] Receiver requested resume");
          this.isPaused = false;
          this.pauseCallback?.(false);
          // Continue sending from where we left off
          if (this.currentChunk < this.totalChunks && !this.isCancelled) {
            this.sendNextChunk();
          }
        }
      });

      // NOTE: We no longer send the first chunk here!
      // Instead, we wait for file-accept message above before starting
      console.log("[SENDER] Waiting for receiver to accept...");
    });
  }

  /**
   * Read and send the next chunk
   */
  private sendNextChunk(): void {
    if (this.isCancelled) return;

    const start = this.currentChunk * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, this.file.size);
    const blob = this.file.slice(start, end);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result || this.isCancelled) return;

      const arrayBuffer = event.target.result as ArrayBuffer;
      this.sendChunk(arrayBuffer);
    };

    reader.onerror = () => {
      this.sendError("File read error");
      this.rejectTransfer?.(new Error("File read error"));
    };

    reader.readAsArrayBuffer(blob);
  }

  /**
   * Send binary chunk over DataChannel
   */
  private sendChunk(data: ArrayBuffer): void {
    const chunkMessage: PeerMessage<ChunkPayload> = {
      type: "chunk",
      transferId: this.transferId,
      payload: {
        chunkIndex: this.currentChunk,
        data,
      },
      timestamp: Date.now(),
    };

    this.connection.send(chunkMessage);
    console.log(`[SENDER] Sent chunk ${this.currentChunk}/${this.totalChunks}, waiting for ACK...`);
    this.bytesSent += data.byteLength;

    // Log progress every 10%
    const percentage = (this.bytesSent / this.file.size) * 100;
    if (Math.floor(percentage) % 10 === 0 && Math.floor(percentage) !== Math.floor((this.bytesSent - data.byteLength) / this.file.size * 100)) {
      console.log(`[SENDER] Progress: ${percentage.toFixed(0)}% (chunk ${this.currentChunk + 1}/${this.totalChunks})`);
    }

    // Update progress callback
    if (this.progressCallback) {
      const elapsedTime = Date.now() - this.startTime;
      const speed = this.bytesSent / (elapsedTime / 1000);
      const timeRemaining = (this.file.size - this.bytesSent) / speed;

      this.progressCallback({
        transferId: this.transferId,
        bytesTransferred: this.bytesSent,
        totalBytes: this.file.size,
        percentage,
        speed,
        timeRemaining,
      });
    }
  }

  /**
   * Send transfer complete message
   */
  private sendComplete(): void {
    const completeMessage: PeerMessage = {
      type: "transfer-complete",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };

    this.connection.send(completeMessage);
    console.log("[SENDER] Transfer complete!");
  }

  /**
   * Send error message
   */
  private sendError(error: string): void {
    const errorMessage: PeerMessage = {
      type: "transfer-error",
      transferId: this.transferId,
      payload: { error },
      timestamp: Date.now(),
    };

    this.connection.send(errorMessage);
  }

  /**
   * Cancel transfer - notify receiver and stop
   */
  cancel(): void {
    this.isCancelled = true;
    const cancelMessage: PeerMessage = {
      type: "transfer-cancel",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    try {
      this.connection.send(cancelMessage);
    } catch (e) {
      console.warn("[SENDER] Failed to send cancel message:", e);
    }
    this.rejectTransfer?.(new Error("Transfer cancelled by sender"));
  }

  /**
   * Pause transfer - stop sending chunks
   */
  pause(): void {
    if (this.isCancelled || this.isPaused) return;
    this.isPaused = true;
    const pauseMessage: PeerMessage = {
      type: "transfer-pause",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    try {
      this.connection.send(pauseMessage);
    } catch (e) {
      console.warn("[SENDER] Failed to send pause message:", e);
    }
    console.log("[SENDER] Transfer paused");
  }

  /**
   * Resume transfer - continue sending chunks
   */
  resume(): void {
    if (this.isCancelled || !this.isPaused) return;
    this.isPaused = false;
    const resumeMessage: PeerMessage = {
      type: "transfer-resume",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    try {
      this.connection.send(resumeMessage);
    } catch (e) {
      console.warn("[SENDER] Failed to send resume message:", e);
    }
    console.log("[SENDER] Transfer resumed, continuing from chunk", this.currentChunk);
    // Continue sending
    if (this.currentChunk < this.totalChunks) {
      this.sendNextChunk();
    }
  }

  /**
   * Check if transfer is paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Register cancel callback
   */
  onCancel(callback: () => void): void {
    this.cancelCallback = callback;
  }

  /**
   * Register pause state change callback
   */
  onPauseChange(callback: (paused: boolean) => void): void {
    this.pauseCallback = callback;
  }

  /**
   * Register rejection callback (receiver declined the file)
   */
  onReject(callback: () => void): void {
    this.rejectCallback = callback;
  }

  /**
   * Get current chunk index (for resumption info)
   */
  getCurrentChunk(): number {
    return this.currentChunk;
  }

  /**
   * Get total chunks
   */
  getTotalChunks(): number {
    return this.totalChunks;
  }

  /**
   * Get transfer ID
   */
  getTransferId(): string {
    return this.transferId;
  }
}
