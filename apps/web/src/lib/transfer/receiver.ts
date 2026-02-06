import type { DataConnection } from "peerjs";
import type { PeerMessage, FileOfferPayload, ChunkPayload, TransferProgress } from "@repo/types";
import type { FileChunk } from "@repo/types";
import { addChunk, getAllChunks, clearTransfer } from "@/lib/storage/idb-manager";

export class FileReceiver {
  private transferId: string = "";
  private filename: string = "";
  private fileSize: number = 0;
  private fileType: string = "";
  private totalChunks: number = 0;
  private receivedChunks: number = 0;
  private bytesReceived: number = 0;
  private startTime: number = 0;
  private connection: DataConnection | null = null;
  private progressCallback?: (progress: TransferProgress) => void;
  private completeCallback?: (blob: Blob, filename: string) => void;

  /**
   * Set the connection to send ACKs back
   */
  setConnection(connection: DataConnection): void {
    this.connection = connection;
  }

  /**
   * Handle incoming file offer
   */
  handleOffer(message: PeerMessage<FileOfferPayload>): void {
    this.transferId = message.transferId;
    this.filename = message.payload.filename;
    this.fileSize = message.payload.fileSize;
    this.fileType = message.payload.fileType;
    this.totalChunks = message.payload.totalChunks;
    this.startTime = Date.now();
    this.receivedChunks = 0;
    this.bytesReceived = 0;
    console.log("[RECEIVER] handleOffer:", { transferId: this.transferId, filename: this.filename, totalChunks: this.totalChunks });
  }

  /**
   * Handle incoming chunk - store it and send ACK
   */
  async handleChunk(message: PeerMessage<ChunkPayload>): Promise<void> {
    const { chunkIndex, data } = message.payload;

    // Store chunk to IndexedDB
    const chunk: FileChunk = {
      transferId: this.transferId,
      chunkIndex,
      data: new Blob([data]),
      timestamp: Date.now(),
    };

    try {
      await addChunk(chunk);
    } catch (error) {
      console.error(`[RECEIVER] Failed to store chunk ${chunkIndex}:`, error);
      return;
    }

    this.receivedChunks++;
    this.bytesReceived += data.byteLength;

    // Log progress every 10%
    const percentage = (this.receivedChunks / this.totalChunks) * 100;
    if (this.receivedChunks % Math.ceil(this.totalChunks / 10) === 0) {
      console.log(`[RECEIVER] Progress: ${percentage.toFixed(0)}% (chunk ${this.receivedChunks}/${this.totalChunks})`);
    }

    // Update progress callback
    if (this.progressCallback) {
      const elapsedTime = Date.now() - this.startTime;
      const speed = this.bytesReceived / (elapsedTime / 1000);
      const timeRemaining = (this.fileSize - this.bytesReceived) / speed;

      this.progressCallback({
        transferId: this.transferId,
        bytesTransferred: this.bytesReceived,
        totalBytes: this.fileSize,
        percentage,
        speed,
        timeRemaining,
      });
    }

    // CRITICAL: Send ACK back to sender AFTER storing chunk
    this.sendAck(chunkIndex);

    // Check if transfer is complete
    if (this.receivedChunks === this.totalChunks) {
      console.log("[RECEIVER] All chunks received, assembling file...");
      await this.assembleFile();
    }
  }

  /**
   * Send acknowledgment back to sender
   */
  private sendAck(chunkIndex: number): void {
    if (!this.connection) {
      console.warn("[RECEIVER] No connection to send ACK!");
      return;
    }

    console.log(`[RECEIVER] Sending ACK for chunk ${chunkIndex}`);

    const ackMessage: PeerMessage = {
      type: "chunk-ack",
      transferId: this.transferId,
      payload: { chunkIndex },
      timestamp: Date.now(),
    };

    this.connection.send(ackMessage);
  }

  /**
   * Assemble file from IndexedDB chunks
   */
  private async assembleFile(): Promise<void> {
    try {
      console.log("[RECEIVER] assembleFile: Retrieving chunks from IndexedDB...");
      const chunks = await getAllChunks(this.transferId);
      console.log("[RECEIVER] assembleFile: Got", chunks.length, "chunks");

      // Combine chunks into single Blob
      const blobParts = chunks.map((chunk) => chunk.data);
      const finalBlob = new Blob(blobParts, { type: this.fileType });
      console.log("[RECEIVER] assembleFile: Final blob size:", finalBlob.size);

      // Callback with completed file
      if (this.completeCallback) {
        console.log("[RECEIVER] Calling completeCallback");
        this.completeCallback(finalBlob, this.filename);
      } else {
        console.warn("[RECEIVER] No completeCallback set!");
      }

      // Clear chunks from IndexedDB
      await clearTransfer(this.transferId);
      console.log("[RECEIVER] Cleared chunks from IndexedDB");
    } catch (error) {
      console.error("Error assembling file:", error);
    }
  }

  /**
   * Register progress callback
   */
  onProgress(callback: (progress: TransferProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Register completion callback
   */
  onComplete(callback: (blob: Blob, filename: string) => void): void {
    this.completeCallback = callback;
  }
}
