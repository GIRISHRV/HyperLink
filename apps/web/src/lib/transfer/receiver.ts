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
  private progressCallback?: (progress: TransferProgress) => void;
  private completeCallback?: (blob: Blob, filename: string) => void;

  /**
   * CRITICAL: Handle incoming file offer
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
  }

  /**
   * CRITICAL: Handle incoming chunk - write DIRECTLY to IndexedDB
   * NO memory array accumulation!
   */
  async handleChunk(message: PeerMessage<ChunkPayload>): Promise<void> {
    const { chunkIndex, data } = message.payload;

    // CRITICAL: Write chunk immediately to IndexedDB
    const chunk: FileChunk = {
      transferId: this.transferId,
      chunkIndex,
      data: new Blob([data]),
      timestamp: Date.now(),
    };

    await addChunk(chunk);

    this.receivedChunks++;
    this.bytesReceived += data.byteLength;

    // Update progress
    if (this.progressCallback) {
      const elapsedTime = Date.now() - this.startTime;
      const speed = this.bytesReceived / (elapsedTime / 1000);
      const timeRemaining = (this.fileSize - this.bytesReceived) / speed;

      this.progressCallback({
        transferId: this.transferId,
        bytesTransferred: this.bytesReceived,
        totalBytes: this.fileSize,
        percentage: (this.bytesReceived / this.fileSize) * 100,
        speed,
        timeRemaining,
      });
    }

    // Check if transfer is complete
    if (this.receivedChunks === this.totalChunks) {
      await this.assembleFile();
    }
  }

  /**
   * CRITICAL: Assemble file from IndexedDB chunks (ONLY called at 100% complete)
   */
  private async assembleFile(): Promise<void> {
    try {
      // Retrieve all chunks from IndexedDB in order
      const chunks = await getAllChunks(this.transferId);

      // Combine chunks into single Blob
      const blobParts = chunks.map((chunk) => chunk.data);
      const finalBlob = new Blob(blobParts, { type: this.fileType });

      // Callback with completed file
      if (this.completeCallback) {
        this.completeCallback(finalBlob, this.filename);
      }

      // Clear chunks from IndexedDB
      await clearTransfer(this.transferId);
    } catch (error) {
      console.error("Error assembling file:", error);
    }
  }

  /**
   * Handle transfer complete message
   */
  handleComplete(): void {
    // Transfer complete marker (assembleFile is called automatically)
  }

  /**
   * Handle error message
   */
  handleError(message: PeerMessage): void {
    console.error("Transfer error:", message.payload);
  }

  /**
   * Set progress callback
   */
  onProgress(callback: (progress: TransferProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Set complete callback
   */
  onComplete(callback: (blob: Blob, filename: string) => void): void {
    this.completeCallback = callback;
  }

  /**
   * Get transfer info
   */
  getTransferInfo() {
    return {
      transferId: this.transferId,
      filename: this.filename,
      fileSize: this.fileSize,
      fileType: this.fileType,
      totalChunks: this.totalChunks,
      receivedChunks: this.receivedChunks,
      bytesReceived: this.bytesReceived,
    };
  }
}
