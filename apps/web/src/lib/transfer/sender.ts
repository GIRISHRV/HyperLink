import type { DataConnection } from "peerjs";
import type { PeerMessage, FileOfferPayload, ChunkPayload, TransferProgress } from "@repo/types";
import { generateTransferId, calculateChunkCount } from "@repo/utils";

const CHUNK_SIZE = 64 * 1024; // 64KB chunks for higher throughput
const WINDOW_SIZE = 16; // reduced window size to prevent buffer overflow with larger chunks
const MAX_BUFFERED_AMOUNT = 1 * 1024 * 1024; // 1MB backpressure limit

export class FileSender {
  private file: File;
  private connection: DataConnection;
  private transferId: string;
  private totalChunks: number;
  private currentChunk: number = 0;
  private activeChunks: number = 0; // Number of un-acked chunks in flight
  private isCancelled: boolean = false;
  private isPaused: boolean = false;
  private bytesSent: number = 0;
  private startTime: number = 0;
  private dbTransferId?: string;
  private progressCallback?: (progress: TransferProgress) => void;
  private rejectTransfer?: (error: Error) => void;
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

    console.log("[SENDER] 📤 Sending FILE-OFFER to receiver:", offerMessage);
    this.connection.send(offerMessage);
    console.log("[SENDER] ✅ FILE-OFFER sent successfully");
    return this.transferId;
  }
  /**
   * Start Sliding Window transfer
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

      console.log("[SENDER] Setting up Turbo Mode (Sliding Window)...");

      // Listen for connection events to detect failure during transfer
      const onClose = () => {
        console.error("[SENDER] Connection closed during transfer");
        cleanup();
        reject(new Error("Connection closed abruptly"));
      };

      const onError = (err: any) => {
        console.error("[SENDER] Connection error during transfer:", err);
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      const cleanup = () => {
        this.connection.off("close", onClose);
        this.connection.off("error", onError);
        this.isTransferring = false;
      };

      this.connection.on("close", onClose);
      this.connection.on("error", onError);

      let transferStarted = false;

      // Sanity check
      if (this.totalChunks <= 0) {
        cleanup();
        this.sendComplete();
        resolve();
        return;
      }

      // Listen for ACKs and control messages from receiver
      this.connection.on("data", (data: any) => {
        const message = data as PeerMessage;

        if (message.transferId !== this.transferId) return;

        // Wait for file-accept before sending first chunk
        if (message.type === "file-accept" && !transferStarted) {
          console.log("[SENDER] Received file-accept, pumping chunks...");
          transferStarted = true;
          this.pump();
          return;
        }

        if (message.type === "chunk-ack") {
          // Receiver confirmed chunk, slide window
          this.activeChunks = Math.max(0, this.activeChunks - 1);

          if (this.isCancelled) return;
          if (this.isPaused) return;

          // If we finished sending everything and all ACKs are back
          if (this.currentChunk >= this.totalChunks && this.activeChunks <= 0) {
            cleanup();
            this.sendComplete();
            resolve();
            return;
          }

          // Pump more chunks if window allows
          this.pump();

        } else if (message.type === "file-reject") {
          console.log("[SENDER] Receiver rejected the file offer");
          this.isCancelled = true;
          this.rejectCallback?.();
          cleanup();
          reject(new Error("File offer rejected by receiver"));
        } else if (message.type === "transfer-cancel") {
          console.log("[SENDER] Receiver cancelled transfer");
          this.isCancelled = true;
          this.cancelCallback?.();
          cleanup();
          reject(new Error("Transfer cancelled by receiver"));
        } else if (message.type === "transfer-pause") {
          console.log("[SENDER] Receiver requested pause");
          this.isPaused = true;
          this.pauseCallback?.(true);
        } else if (message.type === "transfer-resume") {
          console.log("[SENDER] Receiver requested resume");
          this.isPaused = false;
          this.pauseCallback?.(false);
          this.pump();
        }
      });

      console.log("[SENDER] Waiting for receiver to accept...");
    });
  }

  /**
   * Pump chunks until window is full or buffer is saturated
   */
  private pump(): void {
    if (this.isCancelled || this.isPaused) return;

    // While we have chunks left AND window has space
    while (this.currentChunk < this.totalChunks && this.activeChunks < WINDOW_SIZE) {
      // Check backpressure - if PeerJS buffer is too full, stop pushing
      // @ts-ignore - bufferedAmount exists on DataConnection but might be missing in types
      const bufferedAmount = this.connection.dataChannel?.bufferedAmount || 0;

      if (bufferedAmount > MAX_BUFFERED_AMOUNT) {
        // Wait for buffer to drain (simple retry via timeout or just wait for next ACK)
        // Since we get ACKs, the pump will be called again soon.
        // We can break here and let the next ACK trigger another pump.
        break;
      }

      this.sendNextChunk();
    }
  }

  /**
   * Read and send the next chunk
   */
  private sendNextChunk(): void {
    if (this.isCancelled) return;

    // Capture current index for the closure
    const chunkIndex = this.currentChunk;
    this.currentChunk++;
    this.activeChunks++;

    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, this.file.size);
    const blob = this.file.slice(start, end);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result || this.isCancelled) return;

      const arrayBuffer = event.target.result as ArrayBuffer;
      this.sendChunk(arrayBuffer, chunkIndex);
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
  private sendChunk(data: ArrayBuffer, chunkIndex: number): void {
    const chunkMessage: PeerMessage<ChunkPayload> = {
      type: "chunk",
      transferId: this.transferId,
      payload: {
        chunkIndex: chunkIndex,
        data,
      },
      timestamp: Date.now(),
    };

    this.connection.send(chunkMessage);
    this.bytesSent += data.byteLength;

    // Log progress periodically
    const percentage = (this.bytesSent / this.file.size) * 100;

    // Update progress callback
    if (this.progressCallback) {
      const elapsedTime = Math.max(1, Date.now() - this.startTime);
      const speed = this.bytesSent / (elapsedTime / 1000); // bytes per second
      const timeRemaining = speed > 0 ? (this.file.size - this.bytesSent) / speed : 0;

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
    console.log("[SENDER] Transfer resumed, pumping...");
    this.pump();
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
