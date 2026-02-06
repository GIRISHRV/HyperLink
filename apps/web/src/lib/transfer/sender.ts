import type { DataConnection } from "peerjs";
import type { PeerMessage, FileOfferPayload, ChunkPayload, TransferProgress } from "@repo/types";
import { generateTransferId, calculateChunkCount } from "@repo/utils";

const CHUNK_SIZE = 65536; // 64KB
const BUFFER_THRESHOLD = 16 * 1024 * 1024; // 16MB

export class FileSender {
  private file: File;
  private connection: DataConnection;
  private transferId: string;
  private totalChunks: number;
  private currentChunk: number = 0;
  private isPaused: boolean = false;
  private bytesSent: number = 0;
  private startTime: number = 0;
  private reader: FileReader | null = null;
  private progressCallback?: (progress: TransferProgress) => void;

  constructor(file: File, connection: DataConnection) {
    this.file = file;
    this.connection = connection;
    this.transferId = generateTransferId();
    this.totalChunks = calculateChunkCount(file.size, CHUNK_SIZE);
  }

  /**
   * CRITICAL: Send file offer to receiver
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
   * CRITICAL: Start chunked transfer with backpressure control
   */
  async startTransfer(onProgress?: (progress: TransferProgress) => void): Promise<void> {
    this.progressCallback = onProgress;
    this.startTime = Date.now();

    return new Promise((resolve, reject) => {
      this.reader = new FileReader();

      this.reader.onload = (event) => {
        if (!event.target?.result || this.isPaused) return;

        const arrayBuffer = event.target.result as ArrayBuffer;
        this.sendChunk(arrayBuffer);

        // Check backpressure BEFORE reading next chunk
        this.checkBackpressure(() => {
          this.currentChunk++;

          if (this.currentChunk < this.totalChunks) {
            this.readNextChunk();
          } else {
            this.sendComplete();
            resolve();
          }
        });
      };

      this.reader.onerror = (error) => {
        this.sendError("File read error");
        reject(error);
      };

      // Start reading first chunk
      this.readNextChunk();
    });
  }

  /**
   * CRITICAL: Read file chunk (64KB at a time)
   */
  private readNextChunk(): void {
    if (!this.reader || this.isPaused) return;

    const start = this.currentChunk * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, this.file.size);
    const blob = this.file.slice(start, end);

    this.reader.readAsArrayBuffer(blob);
  }

  /**
   * CRITICAL: Send binary chunk over DataChannel
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
    this.bytesSent += data.byteLength;

    // Update progress
    if (this.progressCallback) {
      const elapsedTime = Date.now() - this.startTime;
      const speed = this.bytesSent / (elapsedTime / 1000);
      const timeRemaining = (this.file.size - this.bytesSent) / speed;

      this.progressCallback({
        transferId: this.transferId,
        bytesTransferred: this.bytesSent,
        totalBytes: this.file.size,
        percentage: (this.bytesSent / this.file.size) * 100,
        speed,
        timeRemaining,
      });
    }
  }

  /**
   * CRITICAL: Monitor bufferedAmount and pause/resume (BACKPRESSURE CONTROL)
   */
  private checkBackpressure(onReady: () => void): void {
    const channel = (this.connection as any)._channel;

    if (!channel) {
      onReady();
      return;
    }

    const checkBuffer = () => {
      if (channel.bufferedAmount > BUFFER_THRESHOLD) {
        // PAUSE: Buffer is too full
        this.isPaused = true;

        // Wait for buffer to drain
        const drainInterval = setInterval(() => {
          if (channel.bufferedAmount < BUFFER_THRESHOLD / 2) {
            clearInterval(drainInterval);
            this.isPaused = false;
            onReady();
          }
        }, 100);
      } else {
        // RESUME: Buffer is healthy
        onReady();
      }
    };

    checkBuffer();
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
    this.isPaused = true;
    this.reader = null;
  }

  /**
   * Get transfer ID
   */
  getTransferId(): string {
    return this.transferId;
  }
}
