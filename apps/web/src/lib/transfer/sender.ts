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
  private bytesSent: number = 0;
  private startTime: number = 0;
  private progressCallback?: (progress: TransferProgress) => void;
  private rejectTransfer?: (error: Error) => void;

  constructor(file: File, connection: DataConnection) {
    this.file = file;
    this.connection = connection;
    this.transferId = generateTransferId();
    this.totalChunks = calculateChunkCount(file.size, CHUNK_SIZE);
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
    this.progressCallback = onProgress;
    this.startTime = Date.now();

    return new Promise((resolve, reject) => {
      this.rejectTransfer = reject;

      console.log("[SENDER] Setting up ACK listener...");

      // Listen for ACKs from receiver
      this.connection.on("data", (data: any) => {
        console.log("[SENDER] Received data:", data?.type);
        const message = data as PeerMessage;
        if (message.type === "chunk-ack" && message.transferId === this.transferId) {
          console.log(`[SENDER] Got ACK for chunk ${(message.payload as any)?.chunkIndex}`);
          // Receiver confirmed chunk, send next one
          this.currentChunk++;

          if (this.currentChunk < this.totalChunks && !this.isCancelled) {
            this.sendNextChunk();
          } else if (this.currentChunk >= this.totalChunks) {
            // All chunks sent and acknowledged
            this.sendComplete();
            resolve();
          }
        }
      });

      // Send first chunk
      console.log("[SENDER] Sending first chunk...");
      this.sendNextChunk();
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
   * Cancel transfer
   */
  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Get transfer ID
   */
  getTransferId(): string {
    return this.transferId;
  }
}
