import type { DataConnection } from "peerjs";
import type { PeerMessage, FileOfferPayload, ChunkPayload, TransferProgress } from "@repo/types";
import { generateTransferId, calculateChunkCount, logger } from "@repo/utils";
import { generateSalt, deriveKey, encryptChunk, arrayBufferToBase64 } from "@/lib/utils/crypto";
import { validatePeerMessage } from "@/lib/utils/peer-message-validator";
import type { TransferStatus } from "@/lib/hooks/use-transfer-state";

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
  private status: TransferStatus = "idle";
  private bytesSent: number = 0;
  private startTime: number = 0;
  private dbTransferId?: string;
  private progressCallback?: (progress: TransferProgress) => void;
  private rejectTransfer?: (error: Error) => void;
  private cancelCallback?: () => void;
  private pauseCallback?: (paused: boolean) => void;
  private rejectCallback?: () => void;
  private acceptedCallback?: () => void;
  private lastAckTimestamp: number = 0;
  private probeTimer: NodeJS.Timeout | null = null;
  private probeCount: number = 0;
  private readonly PROBE_INTERVAL = 3000;
  private readonly MAX_PROBES = 5;

  // Encryption state
  private salt?: Uint8Array;
  private cryptoKey?: CryptoKey;

  constructor(file: File, connection: DataConnection, dbTransferId?: string) {
    this.file = file;
    this.connection = connection;
    this.transferId = generateTransferId();
    this.totalChunks = calculateChunkCount(file.size, CHUNK_SIZE);
    this.dbTransferId = dbTransferId;
    logger.info({ transferId: this.transferId, dbTransferId }, "[SENDER] Initialized FileSender");
  }

  /**
   * Set password for E2E encryption
   */
  async setPassword(password: string): Promise<void> {
    if (!password) return;
    try {
      this.salt = generateSalt();
      this.cryptoKey = await deriveKey(password, this.salt);
      // FINDING-018: Do NOT store `password` on `this` — the non-extractable
      // CryptoKey is sufficient. Plaintext password goes out of scope here.
      logger.info("[SENDER] 🔐 Encryption enabled and key derived");
    } catch (e) {
      logger.error({ e }, "[SENDER] Failed to setup encryption");
      throw new Error("Encryption setup failed");
    }
  }

  /**
   * Send file offer to receiver with defensive check
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
        isEncrypted: !!this.cryptoKey,
        salt: this.salt ? arrayBufferToBase64(this.salt) : undefined,
      },
      timestamp: Date.now(),
    };

    logger.info({ offerMessage }, "[SENDER] 📤 Sending FILE-OFFER to receiver");
    await this.safeSend(offerMessage);
    logger.info("[SENDER] ✅ FILE-OFFER sent successfully");
    return this.transferId;
  }

  /**
   * Start Sliding Window transfer
   */
  async startTransfer(onProgress?: (progress: TransferProgress) => void): Promise<void> {
    if (this.status === "transferring" || this.status === "paused") {
      logger.warn("[SENDER] Transfer already in progress, ignoring duplicate call");
      return;
    }

    this.status = "transferring";
    this.progressCallback = onProgress;
    this.startTime = Date.now();

    return new Promise((resolve, reject) => {
      this.rejectTransfer = reject;

      logger.info("[SENDER] Setting up Turbo Mode (Sliding Window)...");

      // Listen for connection events to detect failure during transfer
      const onClose = () => {
        logger.error("[SENDER] Connection closed during transfer");
        cleanup();
        reject(new Error("Connection closed abruptly"));
      };

      const onError = (err: unknown) => {
        logger.error({ err }, "[SENDER] Connection error during transfer");
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      const cleanup = () => {
        this.stopHeartbeat();
        this.connection.off("close", onClose);
        this.connection.off("error", onError);
        if (this.status === "transferring" || this.status === "paused") {
          this.status = "failed";
        }
      };

      this.connection.on("close", onClose);
      this.connection.on("error", onError);

      let transferStarted = false;

      // Sanity check
      if (this.totalChunks <= 0) {
        cleanup();
        this.sendComplete().catch(err => logger.error({ err }, "[SENDER] sendComplete failed"));
        resolve();
        return;
      }

      // Listen for ACKs and control messages from receiver
      this.connection.on("data", (data: unknown) => {
        // FINDING-017: Validate message shape before processing
        const message = validatePeerMessage(data);
        if (!message) {
          logger.warn("[SENDER] Received invalid/unknown message, ignoring");
          return;
        }
        if (message.transferId !== this.transferId) return;

        // Wait for file-accept before sending first chunk
        if (message.type === "file-accept" && !transferStarted) {
          logger.info("[SENDER] Received file-accept, pumping chunks...");
          transferStarted = true;
          this.acceptedCallback?.();
          this.lastAckTimestamp = Date.now();
          this.startHeartbeat();
          this.pump();
          return;
        }

        // Handle resume-from (crash recovery): receiver already has some chunks
        if (message.type === "resume-from" && transferStarted) {
          const startChunk = (message.payload as { startChunk: number })?.startChunk;
          if (typeof startChunk === "number" && startChunk > 0 && startChunk < this.totalChunks) {
            logger.info({ startChunk, previousChunk: this.currentChunk }, "[SENDER] Resuming from chunk (receiver has prior data)");
            this.currentChunk = startChunk;
            this.pump();
          }
          return;
        }

        if (message.type === "chunk-ack") {
          // Receiver confirmed chunk, slide window
          this.activeChunks = Math.max(0, this.activeChunks - 1);
          this.lastAckTimestamp = Date.now();
          this.probeCount = 0;

          if (this.status === "cancelled") return;
          if (this.status === "paused") return;

          // If we finished sending everything and all ACKs are back
          if (this.currentChunk >= this.totalChunks && this.activeChunks <= 0) {
            cleanup();
            this.sendComplete().catch(err => {
              logger.error({ err }, "[SENDER] Final complete failed");
            }).finally(() => {
              resolve();
            });
            return;
          }

          // Pump more chunks if window allows
          this.pump();

        } else if (message.type === "file-reject") {
          if (this.status === "cancelled" || this.status === "complete") return;
          logger.info("[SENDER] Receiver rejected the file offer");
          this.status = "cancelled";
          this.rejectCallback?.();
          cleanup();
          reject(new Error("File offer rejected by receiver"));
        } else if (message.type === "transfer-cancel") {
          if (this.status === "cancelled" || this.status === "complete") return;
          logger.info("[SENDER] Receiver cancelled transfer");
          this.status = "cancelled";
          this.cancelCallback?.();
          cleanup();
          reject(new Error("Transfer cancelled by receiver"));
        } else if (message.type === "transfer-pause") {
          if (this.status === "cancelled" || this.status === "complete") return;
          logger.info("[SENDER] Receiver requested pause");
          this.status = "paused";
          this.pauseCallback?.(true);
        } else if (message.type === "transfer-resume") {
          if (this.status === "cancelled" || this.status === "complete") return;
          logger.info("[SENDER] Receiver requested resume");
          this.status = "transferring";
          this.pauseCallback?.(false);
          this.pump();
        }
      });

      logger.info("[SENDER] Waiting for receiver to accept...");
    });
  }

  /**
   * Pump chunks until window is full or buffer is saturated
   */
  private pump(): void {
    if (this.status === "cancelled" || this.status === "paused") return;

    // While we have chunks left AND window has space
    while (this.currentChunk < this.totalChunks && this.activeChunks < WINDOW_SIZE) {
      // Check backpressure — stop pushing if the WebRTC DataChannel buffer is saturated.
      // PeerJS exposes dataChannel on DataConnection at runtime; we cast to access it.
      const peerConn = this.connection as unknown as { dataChannel?: RTCDataChannel };
      const bufferedAmount = peerConn.dataChannel?.bufferedAmount ?? 0;

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
  private async sendNextChunk(): Promise<void> {
    if (this.status === "cancelled") return;

    // Capture current index before incrementing
    const chunkIndex = this.currentChunk;
    this.currentChunk++;
    this.activeChunks++;

    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, this.file.size);

    let arrayBuffer: ArrayBuffer;
    try {
      // FINDING-030: Use blob.arrayBuffer() instead of FileReader.
      // Modern async/await API — no callbacks, no intermediate copies.
      arrayBuffer = await this.file.slice(start, end).arrayBuffer();
    } catch (e) {
      logger.error({ e, chunkIndex }, "[SENDER] File read error");
      this.sendError("File read error").catch(err => logger.error({ err }, "[SENDER] sendError failed"));
      this.rejectTransfer?.(new Error("File read error"));
      return;
    }

    if (this.status as string === "cancelled") return;

    // Encrypt if key is present
    if (this.cryptoKey) {
      try {
        arrayBuffer = await encryptChunk(arrayBuffer, this.cryptoKey);
      } catch (e) {
        logger.error({ e }, "[SENDER] Encryption failed for chunk " + chunkIndex);
        this.sendError("Encryption failed");
        this.rejectTransfer?.(new Error("Encryption failed"));
        return;
      }
    }

    this.sendChunk(arrayBuffer, chunkIndex);
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

    this.safeSend(chunkMessage).catch(err => {
      logger.error({ err }, "[SENDER] Failed to send chunk");
      this.sendError("Chunk transmission failed");
      this.rejectTransfer?.(new Error("Chunk transmission failed"));
    });

    // Track bytes read from source file, or bytes sent?
    // Using payload size (which might include IV/Tag overhead) gives 'network progress'.
    // Using file slice size gives 'file progress'.
    // `data.byteLength` includes Overhead.
    // Let's us `data.byteLength` for now as it represents actual transfer.
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
  private async sendComplete(): Promise<void> {
    const completeMessage: PeerMessage = {
      type: "transfer-complete",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };

    await this.safeSend(completeMessage);
    this.status = "complete";
    logger.info("[SENDER] Transfer complete!");
  }

  /**
   * Send error message
   */
  private async sendError(error: string): Promise<void> {
    const errorMessage: PeerMessage = {
      type: "transfer-error",
      transferId: this.transferId,
      payload: { error },
      timestamp: Date.now(),
    };

    await this.safeSend(errorMessage);
  }

  /**
   * Defensive message sending wrapper
   */
  private async safeSend(message: unknown): Promise<void> {
    if (this.status === "cancelled") return;

    // Wait for connection to be ready if it's not open yet
    if (!this.connection.open) {
      logger.warn("[SENDER] Connection not open. Waiting for ready state...");
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for connection to open")), 5000);

        const onOpen = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.connection.once("open", onOpen);

        // If it was already closed, reject immediately
        // Use type assertion to access internal properties
        const conn = this.connection as unknown as { _disconnected: boolean; _closed: boolean };
        if (conn._disconnected || conn._closed) {
          clearTimeout(timeout);
          this.connection.off("open", onOpen);
          reject(new Error("Connection is closed"));
        }
      });
    }

    try {
      this.connection.send(message);
    } catch (err: unknown) {
      const conn = this.connection as unknown as { dataChannel: { readyState: string } };
      logger.error({ readyState: conn.dataChannel?.readyState, err }, "[SENDER] Send failed");

      // If it's a "not open" error despite the check, wait a tick and retry once
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("not open")) {
        logger.info("[SENDER] Retrying send after tick...");
        await new Promise(r => setTimeout(r, 100));

        if (this.status as string === "cancelled") return;
        const retryConn = this.connection as unknown as { _disconnected: boolean; _closed: boolean };
        if (retryConn._disconnected || retryConn._closed) {
          logger.warn("[SENDER] Connection permanently closed, abandoning retry.");
          return;
        }

        try {
          this.connection.send(message);
        } catch (retryErr) {
          logger.error({ retryErr }, "[SENDER] Retry also failed");
          throw retryErr;
        }
      } else {
        throw err;
      }
    }
  }

  /**
   * Cancel transfer - notify receiver and stop
   */
  async cancel(): Promise<void> {
    if (this.status === "cancelled" || this.status === "complete") return;
    // Stop the pump loop immediately so no more chunks are sent
    this.status = "paused";
    // Send the cancel message BEFORE setting status to cancelled,
    // because safeSend() short-circuits if status is already "cancelled".
    const cancelMessage: PeerMessage = {
      type: "transfer-cancel",
      transferId: this.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    try {
      await this.safeSend(cancelMessage);
    } catch (e) {
      logger.warn({ e }, "[SENDER] Failed to send cancel message");
    }
    this.status = "cancelled";
    this.cancelCallback?.();
    this.rejectTransfer?.(new Error("Transfer cancelled by sender"));
  }

  /**
   * Pause transfer - stop sending chunks
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
    logger.info("[SENDER] Transfer paused");
  }

  /**
   * Resume transfer - continue sending chunks
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
    logger.info("[SENDER] Transfer resumed, pumping...");
    this.pump();
  }

  /**
   * Check if transfer is paused
   */
  getStatus(): TransferStatus {
    return this.status;
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
   * Register acceptance callback (receiver accepted the offer)
   */
  onAccepted(callback: () => void): void {
    this.acceptedCallback = callback;
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

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.probeTimer = setInterval(() => {
      if (this.status !== "transferring" || this.activeChunks === 0) return;

      const now = Date.now();
      if (now - this.lastAckTimestamp > this.PROBE_INTERVAL) {
        this.sendProbe();
      }
    }, 1000);
  }

  private stopHeartbeat(): void {
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = null;
    }
  }

  private async sendProbe(): Promise<void> {
    if (this.probeCount >= this.MAX_PROBES) {
      logger.error({ transferId: this.transferId, probes: this.probeCount }, "[SENDER] Transfer stalled. Max probes reached.");
      this.sendError("Transfer stalled (connection lost)").catch(() => { });
      this.rejectTransfer?.(new Error("Transfer stalled"));
      this.cancel();
      return;
    }

    this.probeCount++;
    // Re-send the last un-acked chunk as a probe
    // The "last un-acked" is currentChunk - activeChunks
    const probeIndex = Math.max(0, this.currentChunk - this.activeChunks);

    logger.warn({
      transferId: this.transferId,
      probeIndex,
      probeCount: this.probeCount,
      activeChunks: this.activeChunks
    }, "[SENDER] Sending chunk-probe (ACK delayed)");

    const start = probeIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, this.file.size);

    try {
      let arrayBuffer = await this.file.slice(start, end).arrayBuffer();
      if (this.cryptoKey) {
        arrayBuffer = await encryptChunk(arrayBuffer, this.cryptoKey);
      }

      const probeMessage: PeerMessage<ChunkPayload> = {
        type: "chunk-probe",
        transferId: this.transferId,
        payload: {
          chunkIndex: probeIndex,
          data: arrayBuffer,
        },
        timestamp: Date.now(),
      };

      await this.safeSend(probeMessage);
    } catch (err) {
      logger.error({ err, probeIndex }, "[SENDER] Probe failed");
    }
  }
}
