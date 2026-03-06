import type { DataConnection } from "peerjs";
import type { PeerMessage, FileOfferPayload, ChunkPayload, TransferProgress } from "@repo/types";
import type { FileChunk } from "@repo/types";
import { addChunk, assembleFileFromCursor, clearTransfer, addFile, getLastReceivedChunkIndex } from "@/lib/storage/idb-manager";
import { logger } from "@repo/utils";
import { deriveKey, decryptChunk, base64ToArrayBuffer } from "@/lib/utils/crypto";
import type { TransferStatus } from "@/lib/hooks/use-transfer-state";

const INITIAL_CHUNK_SIZE = 64 * 1024; // Must match sender's initial CHUNK_SIZE


export class FileReceiver {
  private transferId: string = "";
  private storageId: string | null = null;
  private filename: string = "";
  private fileSize: number = 0;
  private fileType: string = "";
  private totalChunks: number = 0;
  private receivedChunks: number = 0;
  private bytesReceived: number = 0;
  private startTime: number = 0;
  private connection: DataConnection | null = null;
  private status: TransferStatus = "idle";
  private progressCallback?: (progress: TransferProgress) => void;
  private completeCallback?: (blob: Blob, filename: string) => void;
  private cancelCallback?: () => void;
  private pauseCallback?: (paused: boolean) => void;
  private errorCallback?: (error: Error | string) => void;
  private cleanupCallback?: (cleared: number, total: number) => void;
  private resumeFromChunk: number = 0; // For crash recovery

  // Encryption state
  private isEncrypted: boolean = false;
  private salt?: Uint8Array;
  private cryptoKey?: CryptoKey;
  private onLog?: (msg: string) => void;

  /**
   * Set log subscriber
   */
  setOnLog(callback: (msg: string) => void): void {
    this.onLog = callback;
  }

  /**
   * Set the ID to use for storage (overriding the P2P transfer ID)
   */
  setStorageId(id: string): void {
    this.storageId = id;
  }

  /**
   * Set the connection to send ACKs back
   */
  setConnection(connection: DataConnection): void {
    this.connection = connection;
  }

  /**
   * Register error callback
   */
  onError(callback: (error: Error | string) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Handle incoming file offer
   */
  async handleOffer(message: PeerMessage<FileOfferPayload>): Promise<void> {
    this.transferId = message.transferId;
    this.filename = message.payload.filename;
    this.fileSize = message.payload.fileSize;
    this.fileType = message.payload.fileType;
    this.totalChunks = message.payload.totalChunks;

    this.onLog?.(`[SYS] Incoming FILE-OFFER: ${this.filename} (${this.fileSize} bytes)`);

    // Set storage ID from payload if present (for history/persistence)
    if (message.payload.dbTransferId) {
      this.storageId = message.payload.dbTransferId;
    }

    // Encryption metadata
    this.isEncrypted = !!message.payload.isEncrypted;

    if (this.isEncrypted && message.payload.salt) {
      this.salt = base64ToArrayBuffer(message.payload.salt);
      logger.info("[RECEIVER] 🔒 File is encrypted, salt received");
      this.onLog?.("[SEC] 🔒 File is encrypted, salt received.");
    }

    this.startTime = Date.now();
    this.receivedChunks = 0;
    this.bytesReceived = 0;
    this.resumeFromChunk = 0;

    // Check IDB for previously received chunks (crash recovery)
    this.onLog?.("[DB] Scanning IndexedDB for partial transfer data...");
    try {
      const lastIndex = await getLastReceivedChunkIndex(this.transferId);
      if (lastIndex >= 0) {
        this.receivedChunks = lastIndex + 1;
        this.bytesReceived = Math.min(this.receivedChunks * INITIAL_CHUNK_SIZE, this.fileSize);
        this.resumeFromChunk = lastIndex + 1;
        logger.info({
          transferId: this.transferId,
          resumeFrom: this.resumeFromChunk,
          existingChunks: this.receivedChunks
        }, "[RECEIVER] Found existing chunks in IDB, will resume");
        this.onLog?.(`[DB] Found existing chunks in IDB. Resuming from chunk ${this.resumeFromChunk}.`);
      }
    } catch (err) {
      logger.warn({ err }, "[RECEIVER] Failed to check for existing chunks, starting fresh");
    }

    logger.info({
      transferId: this.transferId,
      storageId: this.storageId,
      filename: this.filename,
      totalChunks: this.totalChunks,
      isEncrypted: this.isEncrypted,
      resumeFrom: this.resumeFromChunk
    }, "[RECEIVER] handleOffer");
  }

  /**
   * Compute/Derive the key. This should be called after user inputs password.
   */
  async processPassword(password: string): Promise<void> {
    if (!this.isEncrypted || !this.salt) return;
    try {
      this.cryptoKey = await deriveKey(password, this.salt);
      logger.info("[RECEIVER] 🔑 Key derived successfully");
      this.onLog?.("[SEC] 🔑 Key derived successfully.");
    } catch (e) {
      logger.error({ e }, "[RECEIVER] Failed to derive key");
      throw new Error("Failed to derive encryption key");
    }
  }

  /**
   * Handle incoming chunk - store it and send ACK
   */
  async handleChunk(message: PeerMessage<ChunkPayload>): Promise<void> {
    if (this.status === "cancelled" || this.status === "complete") return;

    const { chunkIndex, data } = message.payload;
    const isProbe = message.type === "chunk-probe";

    // IDEMPOTENCY CHECK: If we already processed this chunk, just ACK and skip.
    // This is crucial for Task 2 (ACK Resilience) so we don't do redundant IDB writes.
    // Since we are mostly sequential (sliding window), index < resumeFromChunk is a solid indicator.
    // For intermediate duplicates, we rely on the fact that we increment receivedChunks only for NEW ones.
    if (chunkIndex < this.resumeFromChunk) {
      if (isProbe) {
        logger.debug({ chunkIndex }, "[RECEIVER] Received probe for already-processed chunk, re-ACKing");
        this.onLog?.(`[NET] Received duplicate probe for chunk ${chunkIndex}. Re-ACKing to prevent deadlock.`);
      }
      this.sendAck(chunkIndex);
      return;
    }

    let chunkData = data;

    // Decrypt if encrypted
    if (this.isEncrypted) {
      if (!this.cryptoKey) {
        logger.error("[RECEIVER] Received chunk but no key available!");
        // We could buffer or fail?
        // Ideally we shouldn't have accepted the file (sent file-accept) until we had the key.
        return;
      }

      try {
        chunkData = await decryptChunk(data, this.cryptoKey);
      } catch (e) {
        logger.error({ chunkIndex, e }, "[RECEIVER] Decryption failed! Wrong password?");
        this.onLog?.("[ERR] [SEC] Decryption failed! Incorrect password or corrupted data.");

        // Notify UI about specific error
        if (this.errorCallback) {
          this.errorCallback("DECRYPTION_FAILED");
        }

        // Send error back?
        // Or just fail locally.
        this.cancel();
        return;
      }
    }

    // Store chunk to IndexedDB
    const chunk: FileChunk = {
      transferId: this.transferId,
      chunkIndex,
      data: new Blob([chunkData]),
      timestamp: Date.now(),
    };

    try {
      await addChunk(chunk);
    } catch (error) {
      logger.error({ chunkIndex, error }, "[RECEIVER] Failed to store chunk");
      this.onLog?.(`[WARN] [DB] Storage write failed for chunk ${chunkIndex}.`);
      // EDGE-001: Notify sender of failure to prevent ACK deadlock
      if (this.connection) {
        const errorMsg: PeerMessage = {
          type: "transfer-error",
          transferId: this.transferId,
          payload: { message: "Storage write failed" },
          timestamp: Date.now(),
        };
        this.connection.send(errorMsg);
      }
      this.cancel();
      return;
    }

    this.receivedChunks++;
    this.bytesReceived += chunkData.byteLength; // Track decrypted size
    // For live idempotency (Task 2), keep resumeFromChunk updated as the progress pointer
    if (chunkIndex >= this.resumeFromChunk) {
      this.resumeFromChunk = chunkIndex + 1;
    }

    // Log progress every 10%
    const percentage = (this.receivedChunks / this.totalChunks) * 100;
    if (this.receivedChunks % Math.ceil(this.totalChunks / 10) === 0) {
      logger.info({ percentage: percentage.toFixed(0), chunk: this.receivedChunks, total: this.totalChunks }, "[RECEIVER] Progress");
    }

    // Update progress callback
    if (this.progressCallback) {
      const elapsedTime = Math.max(1, Date.now() - this.startTime);
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

    // Check if transfer is complete via byte count (Safety)
    if (this.bytesReceived >= this.fileSize) {
      logger.info("[RECEIVER] All bytes received via count, assembling file...");
      this.onLog?.("[FS] All bytes received via count. Initiating file assembly...");
      await this.assembleFile();
    }
  }

  /**
   * Send acknowledgment back to sender
   */
  private sendAck(chunkIndex: number): void {
    if (!this.connection) {
      logger.warn("[RECEIVER] No connection to send ACK!");
      return;
    }

    // Log ACK sparingly to avoid flooding console
    if (chunkIndex % 100 === 0) {
      logger.debug({ chunkIndex }, "[RECEIVER] ACK batch");
    }

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
      logger.info("[RECEIVER] assembleFile: Assembling chunks using IDB cursor stream...");
      this.onLog?.("[FS] Assembling chunks from IDB cursor stream...");

      const finalBlob = await assembleFileFromCursor(this.transferId, this.fileType);
      this.status = "complete";
      logger.info({ size: finalBlob.size }, "[RECEIVER] assembleFile: Final blob constructed in memory");
      this.onLog?.(`[FS] Final Blob constructed in memory: ${finalBlob.size} bytes.`);

      // Store the completed file blob to IndexedDB
      try {
        const saveId = this.storageId || this.transferId;
        await addFile(saveId, this.fileType, finalBlob);
        logger.info({ saveId }, "[RECEIVER] Saved completed file to IndexedDB");
        this.onLog?.("[DB] Saved completed file to persistent storage.");
      } catch (e) {
        logger.error({ error: e }, "[RECEIVER] Failed to save completed file");
      }

      // Callback with completed file
      if (this.completeCallback) {
        logger.info("[RECEIVER] Calling completeCallback");
        this.completeCallback(finalBlob, this.filename);
      } else {
        logger.warn("[RECEIVER] No completeCallback set!");
      }

      // Clear chunks from IndexedDB with batched progress reporting (Task #6)
      this.onLog?.("[DB] Initiating chunk garbage collection...");
      await clearTransfer(this.transferId, (cleared, total) => {
        this.cleanupCallback?.(cleared, total);
      }, this.onLog);
      logger.info("[RECEIVER] Cleared chunks from IndexedDB");
    } catch (error) {
      logger.error({ error }, "Error assembling file");
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
   * Register cleanup progress callback (Task #6)
   */
  onCleanup(callback: (cleared: number, total: number) => void): void {
    this.cleanupCallback = callback;
  }

  /**
   * Handle control messages from sender (cancel, pause, resume)
   */
  handleControlMessage(message: PeerMessage): boolean {
    if (message.transferId !== this.transferId) return false;
    if (this.status === "cancelled" || this.status === "complete") return false;

    if (message.type === "transfer-cancel") {
      logger.info("[RECEIVER] Sender cancelled transfer");
      this.onLog?.("[SYS] Sender cancelled transfer. Initiating cleanup...");
      this.status = "cancelled";
      this.cancelCallback?.();
      // Clean up partial chunks from IndexedDB with batched progress reporting (Task #6)
      clearTransfer(this.transferId, (cleared, total) => {
        this.cleanupCallback?.(cleared, total);
      }, this.onLog).catch(err => logger.error({ err }, "[RECEIVER] clearTransfer failed"));
      return true;
    }

    if (message.type === "transfer-pause") {
      logger.info("[RECEIVER] Sender paused transfer");
      this.onLog?.("[SYS] Sender paused transfer.");
      this.status = "paused";
      this.pauseCallback?.(true);
      return true;
    }

    if (message.type === "transfer-resume") {
      logger.info("[RECEIVER] Sender resumed transfer");
      this.onLog?.("[SYS] Sender resumed transfer.");
      this.status = "transferring";
      this.pauseCallback?.(false);
      return true;
    }

    if (message.type === "transfer-complete") {
      logger.info("[RECEIVER] Sender signaled transfer complete, assembling...");
      this.onLog?.("[SYS] Sender signaled transfer complete.");
      this.assembleFile();
      return true;
    }

    return false;
  }

  /**
   * Defensive message sending wrapper
   */
  private async safeSend(message: unknown): Promise<void> {
    if (this.status === "cancelled") return;

    if (!this.connection) {
      logger.warn("[RECEIVER] No connection to send message");
      return;
    }

    if (!this.connection.open) {
      logger.warn("[RECEIVER] Connection not open. Waiting...");
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);
        this.connection!.once("open", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    try {
      this.connection.send(message);
      // Small buffer drain wait helper
      const dc = (this.connection as any).dataChannel as RTCDataChannel;
      if (dc && dc.bufferedAmount > 0) {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (dc.bufferedAmount === 0) resolve();
            else setTimeout(check, 50);
          };
          check();
          setTimeout(resolve, 500); // 500ms max wait
        });
      }
    } catch (err) {
      logger.error({ err }, "[RECEIVER] safeSend failed");
    }
  }

  /**
   * Cancel transfer from receiver side - notify sender and clean up
   */
  async cancel(): Promise<void> {
    if (this.status === "cancelled" || this.status === "complete") return;
    // IMPORTANT: Send the cancel message BEFORE setting status to cancelled,
    // because safeSend() short-circuits if status is already "cancelled".
    const cancelMessage: PeerMessage = {
      type: "transfer-cancel",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    await this.safeSend(cancelMessage);
    this.status = "cancelled";
    // Clean up partial chunks from IndexedDB with batched progress reporting (Task #6)
    clearTransfer(this.storageId || this.transferId, (cleared, total) => {
      this.cleanupCallback?.(cleared, total);
    }, this.onLog).catch(err => logger.error({ err }, "[RECEIVER] clearTransfer failed on cancel"));
    this.cancelCallback?.();
    logger.info("[RECEIVER] Transfer cancelled");
  }

  /**
   * Pause transfer - notify sender to stop sending chunks
   */
  async pause(): Promise<void> {
    if (this.status === "paused" || this.status === "cancelled") return;
    this.status = "paused";
    const pauseMessage: PeerMessage = {
      type: "transfer-pause",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    await this.safeSend(pauseMessage);
    logger.info("[RECEIVER] Transfer paused by receiver");
  }

  /**
   * Resume transfer - notify sender to continue sending chunks
   */
  async resume(): Promise<void> {
    if (this.status !== "paused") return;
    this.status = "transferring";
    const resumeMessage: PeerMessage = {
      type: "transfer-resume",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    await this.safeSend(resumeMessage);
    logger.info("[RECEIVER] Transfer resumed by receiver");
  }

  getStatus(): TransferStatus {
    return this.status;
  }

  /**
   * Get transfer ID
   */
  getTransferId(): string {
    return this.transferId;
  }

  /**
   * Check if file is encrypted
   */
  getIsEncrypted(): boolean {
    return this.isEncrypted;
  }

  /**
   * Get total chunks
   */
  getTotalChunks(): number {
    return this.totalChunks;
  }

  /**
   * Get filename
   */
  getFilename(): string {
    return this.filename;
  }

  /**
   * Get file size
   */
  getFileSize(): number {
    return this.fileSize;
  }

  /**
   * Get the chunk index to resume from (0 = start from beginning)
   */
  getResumeFromChunk(): number {
    return this.resumeFromChunk;
  }

  /**
   * Send resume-from message to sender so it skips already-received chunks.
   * Should be called after file-accept if resumeFromChunk > 0.
   */
  sendResumeFrom(): void {
    if (this.resumeFromChunk <= 0 || !this.connection) return;

    const msg: PeerMessage = {
      type: "resume-from",
      transferId: this.transferId,
      payload: { startChunk: this.resumeFromChunk },
      timestamp: Date.now(),
    };
    this.connection.send(msg);
    logger.info({ startChunk: this.resumeFromChunk }, "[RECEIVER] Sent resume-from to sender");
    this.onLog?.(`[NET] Sent resume-from to sender: Skipping ${this.resumeFromChunk} chunks.`);
  }
}
