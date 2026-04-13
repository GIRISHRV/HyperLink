/**
 * Phase 2 — FileReceiver (receiver.ts)
 *
 * Tests for: FileReceiver class — handleOffer, processPassword, handleChunk,
 * cancel/pause/resume, handleControlMessage, sendResumeFrom.
 *
 * All IDB and crypto dependencies are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileReceiver } from "../receiver";
import type { PeerMessage, FileOfferPayload, ChunkPayload } from "@repo/types";

// ─── Mock dependencies ─────────────────────────────────────────────────

vi.mock("@repo/utils", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/utils/crypto", () => ({
  deriveKey: vi.fn(async () => ({ type: "secret" }) as unknown as CryptoKey),
  base64ToArrayBuffer: vi.fn((_b64: string) => new Uint8Array(16)),
}));

vi.mock("@/lib/utils/encryption-worker-client", () => ({
  encryptionWorkerClient: {
    decrypt: vi.fn(async (data: ArrayBuffer) => data), // passthrough
    encrypt: vi.fn(async (data: ArrayBuffer) => data),
    deriveKey: vi.fn(async (_password: string, salt: ArrayBuffer) => ({
      key: { type: "secret" } as unknown as CryptoKey,
      salt,
    })),
    terminate: vi.fn(),
  },
}));

const mockAddChunk = vi.fn(async (..._args: unknown[]) => {});
const mockAssembleFileFromCursor = vi.fn(
  async (..._args: unknown[]) => new Blob(["assembled-file"])
);
const mockClearTransfer = vi.fn(async (..._args: unknown[]) => {});
const mockAddFile = vi.fn(async (..._args: unknown[]) => {});
const mockGetLastReceivedChunkIndex = vi.fn(async (..._args: unknown[]) => -1);

vi.mock("@/lib/storage/idb-manager", () => ({
  addChunk: (...args: unknown[]) => mockAddChunk(...args),
  assembleFileFromCursor: (...args: unknown[]) => mockAssembleFileFromCursor(...args),
  clearTransfer: (...args: unknown[]) => mockClearTransfer(...args),
  addFile: (...args: unknown[]) => mockAddFile(...args),
  getLastReceivedChunkIndex: (...args: unknown[]) => mockGetLastReceivedChunkIndex(...args),
}));

// ─── Mock DataConnection ───────────────────────────────────────────────

function createMockConnection() {
  return {
    send: vi.fn(),
    open: true,
  };
}

// ─── Helper: create offer message ──────────────────────────────────────

function createOfferMessage(
  overrides: Partial<FileOfferPayload> = {}
): PeerMessage<FileOfferPayload> {
  return {
    type: "file-offer",
    transferId: "test-transfer-1",
    timestamp: Date.now(),
    payload: {
      filename: "document.pdf",
      fileSize: 65536 * 10, // 10 chunks
      fileType: "application/pdf",
      totalChunks: 10,
      dbTransferId: "db-1",
      isEncrypted: false,
      ...overrides,
    },
  };
}

function createChunkMessage(
  chunkIndex: number,
  transferId = "test-transfer-1"
): PeerMessage<ChunkPayload> {
  return {
    type: "chunk",
    transferId,
    timestamp: Date.now(),
    payload: {
      chunkIndex,
      data: new ArrayBuffer(65536),
      offset: chunkIndex * 65536,
    },
  };
}

describe("FileReceiver", () => {
  let receiver: FileReceiver;
  let conn: ReturnType<typeof createMockConnection>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset encryptionWorkerClient mocks to default behavior
    const { encryptionWorkerClient } = await import("@/lib/utils/encryption-worker-client");
    (encryptionWorkerClient.decrypt as ReturnType<typeof vi.fn>).mockResolvedValue(
      new ArrayBuffer(65536)
    );
    (encryptionWorkerClient.encrypt as ReturnType<typeof vi.fn>).mockResolvedValue(
      new ArrayBuffer(65536)
    );
    (encryptionWorkerClient.deriveKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      key: { type: "secret" } as unknown as CryptoKey,
      salt: new Uint8Array(16),
    });

    receiver = new FileReceiver();
    conn = createMockConnection();
    receiver.setConnection(conn as any);
    mockGetLastReceivedChunkIndex.mockResolvedValue(-1);
  });

  // ─── handleOffer ──────────────────────────────────────────────────────

  describe("handleOffer", () => {
    it("extracts metadata from offer message", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      expect(receiver.getTransferId()).toBe("test-transfer-1");
      expect(receiver.getFilename()).toBe("document.pdf");
      expect(receiver.getFileSize()).toBe(65536 * 10);
      expect(receiver.getTotalChunks()).toBe(10);
      expect(receiver.getIsEncrypted()).toBe(false);
    });

    it("detects encrypted file and stores salt", async () => {
      const offer = createOfferMessage({
        isEncrypted: true,
        salt: "bW9ja19zYWx0",
      });
      await receiver.handleOffer(offer);
      expect(receiver.getIsEncrypted()).toBe(true);
    });

    it("sets dbTransferId as storageId", async () => {
      const offer = createOfferMessage({ dbTransferId: "db-xyz" });
      await receiver.handleOffer(offer);
      // storageId is private but affects where files are saved
    });

    it("checks IDB for existing chunks (crash recovery)", async () => {
      mockGetLastReceivedChunkIndex.mockResolvedValue(4);
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);
      expect(receiver.getResumeFromChunk()).toBe(5);
    });

    it("starts fresh if IDB check fails", async () => {
      mockGetLastReceivedChunkIndex.mockRejectedValue(new Error("IDB error"));
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);
      expect(receiver.getResumeFromChunk()).toBe(0);
    });
  });

  // ─── processPassword ─────────────────────────────────────────────────

  describe("processPassword", () => {
    it("derives key when file is encrypted", async () => {
      const offer = createOfferMessage({ isEncrypted: true, salt: "bW9ja19zYWx0" });
      await receiver.handleOffer(offer);

      await receiver.processPassword("my-password");
      // Should not throw
    });

    it("is a no-op when file is not encrypted", async () => {
      const offer = createOfferMessage({ isEncrypted: false });
      await receiver.handleOffer(offer);

      await receiver.processPassword("any-password");
      // Should not throw or derive key
    });

    it("throws if key derivation fails", async () => {
      const { encryptionWorkerClient } = await import("@/lib/utils/encryption-worker-client");
      (encryptionWorkerClient.deriveKey as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("KDF failure")
      );

      const offer = createOfferMessage({ isEncrypted: true, salt: "bW9ja19zYWx0" });
      await receiver.handleOffer(offer);

      await expect(receiver.processPassword("pwd")).rejects.toThrow(
        "Failed to derive encryption key"
      );
    });
  });

  // ─── handleChunk ──────────────────────────────────────────────────────

  describe("handleChunk", () => {
    beforeEach(async () => {
      const offer = createOfferMessage({ totalChunks: 3 });
      await receiver.handleOffer(offer);
    });

    it("stores chunk to IndexedDB and sends ACK", async () => {
      const chunk = createChunkMessage(0);
      await receiver.handleChunk(chunk);

      expect(mockAddChunk).toHaveBeenCalledOnce();
      expect(conn.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "chunk-ack",
          transferId: "test-transfer-1",
          payload: { chunkIndex: 0 },
        })
      );
    });

    it("calls progress callback on each chunk", async () => {
      const progressCb = vi.fn();
      receiver.onProgress(progressCb);

      await receiver.handleChunk(createChunkMessage(0));

      expect(progressCb).toHaveBeenCalledWith(
        expect.objectContaining({
          transferId: "test-transfer-1",
          bytesTransferred: expect.any(Number),
          totalBytes: expect.any(Number),
        })
      );
    });

    it("does not process chunk when cancelled", async () => {
      await receiver.cancel();
      await receiver.handleChunk(createChunkMessage(0));
      expect(mockAddChunk).not.toHaveBeenCalled();
    });

    it("assembles file when all chunks received", async () => {
      const offer = createOfferMessage({ totalChunks: 2, fileSize: 65536 * 2 });
      await receiver.handleOffer(offer);

      const completeCb = vi.fn();
      receiver.onComplete(completeCb);

      await receiver.handleChunk(createChunkMessage(0));
      await receiver.handleChunk(createChunkMessage(1));

      expect(mockAssembleFileFromCursor).toHaveBeenCalled();
      expect(completeCb).toHaveBeenCalledWith(expect.any(Blob), "document.pdf");
      expect(mockClearTransfer).toHaveBeenCalled();
    });

    it("cancels on storage write failure", async () => {
      mockAddChunk.mockRejectedValueOnce(new Error("IDB write failed"));

      await receiver.handleChunk(createChunkMessage(0));
      expect(receiver.getStatus()).toBe("cancelled");
    });
  });

  // ─── Decryption flow ──────────────────────────────────────────────────

  describe("encrypted chunk handling", () => {
    it("calls decrypt for encrypted chunks", async () => {
      const { encryptionWorkerClient } = await import("@/lib/utils/encryption-worker-client");

      const offer = createOfferMessage({ isEncrypted: true, salt: "bW9ja19zYWx0" });
      await receiver.handleOffer(offer);
      await receiver.processPassword("pass");

      await receiver.handleChunk(createChunkMessage(0));
      expect(encryptionWorkerClient.decrypt).toHaveBeenCalled();
    });

    it("cancels on decryption failure (wrong password)", async () => {
      const { encryptionWorkerClient } = await import("@/lib/utils/encryption-worker-client");
      (encryptionWorkerClient.decrypt as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Decryption failed")
      );

      const offer = createOfferMessage({ isEncrypted: true, salt: "bW9ja19zYWx0" });
      await receiver.handleOffer(offer);
      await receiver.processPassword("wrong-pass");

      const errorCb = vi.fn();
      receiver.onError(errorCb);

      await receiver.handleChunk(createChunkMessage(0));

      expect(errorCb).toHaveBeenCalledWith("DECRYPTION_FAILED");
      expect(receiver.getStatus()).toBe("cancelled");
    });
  });

  // ─── cancel / pause / resume ──────────────────────────────────────────

  describe("cancel", () => {
    it("sets status to cancelled and sends cancel message", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      await receiver.cancel();
      expect(receiver.getStatus()).toBe("cancelled");
      expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({ type: "transfer-cancel" }));
    });

    it("cleans up partial chunks from IDB", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);
      await receiver.cancel();
      expect(mockClearTransfer).toHaveBeenCalled();
    });

    it("is a no-op if already cancelled", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);
      await receiver.cancel();
      conn.send.mockClear();
      await receiver.cancel();
      expect(conn.send).not.toHaveBeenCalled();
    });
  });

  describe("pause and resume", () => {
    it("pauses and sends pause message", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      await receiver.pause();
      expect(receiver.getStatus()).toBe("paused");
      expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({ type: "transfer-pause" }));
    });

    it("resumes and sends resume message", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      await receiver.pause();

      await receiver.resume();
      expect(receiver.getStatus()).toBe("transferring");
      expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({ type: "transfer-resume" }));
    });

    it("resume is a no-op when not paused", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      await receiver.resume();
      expect(receiver.getStatus()).toBe("idle");
    });
  });

  // ─── handleControlMessage ─────────────────────────────────────────────

  describe("handleControlMessage", () => {
    it("handles transfer-cancel from sender", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      const cancelCb = vi.fn();
      receiver.onCancel(cancelCb);

      const handled = receiver.handleControlMessage({
        type: "transfer-cancel",
        transferId: "test-transfer-1",
        payload: null,
        timestamp: Date.now(),
      });

      expect(handled).toBe(true);
      expect(receiver.getStatus()).toBe("cancelled");
      expect(cancelCb).toHaveBeenCalled();
    });

    it("handles transfer-pause from sender", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      const pauseCb = vi.fn();
      receiver.onPauseChange(pauseCb);

      const handled = receiver.handleControlMessage({
        type: "transfer-pause",
        transferId: "test-transfer-1",
        payload: null,
        timestamp: Date.now(),
      });

      expect(handled).toBe(true);
      expect(receiver.getStatus()).toBe("paused");
      expect(pauseCb).toHaveBeenCalledWith(true);
    });

    it("handles transfer-resume from sender", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      // First pause
      receiver.handleControlMessage({
        type: "transfer-pause",
        transferId: "test-transfer-1",
        payload: null,
        timestamp: Date.now(),
      });

      const pauseCb = vi.fn();
      receiver.onPauseChange(pauseCb);

      const handled = receiver.handleControlMessage({
        type: "transfer-resume",
        transferId: "test-transfer-1",
        payload: null,
        timestamp: Date.now(),
      });

      expect(handled).toBe(true);
      expect(receiver.getStatus()).toBe("transferring");
    });

    it("returns false for wrong transferId", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      const handled = receiver.handleControlMessage({
        type: "transfer-cancel",
        transferId: "wrong-id",
        payload: null,
        timestamp: Date.now(),
      });

      expect(handled).toBe(false);
    });

    it("returns false for unhandled message type", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      const handled = receiver.handleControlMessage({
        type: "chunk",
        transferId: "test-transfer-1",
        payload: null,
        timestamp: Date.now(),
      });

      expect(handled).toBe(false);
    });
  });

  // ─── sendResumeFrom ───────────────────────────────────────────────────

  describe("sendResumeFrom", () => {
    it("sends resume-from message when resumeFromChunk > 0", async () => {
      mockGetLastReceivedChunkIndex.mockResolvedValue(4);
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      receiver.sendResumeFrom();
      expect(conn.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "resume-from",
          payload: { startChunk: 5 },
        })
      );
    });

    it("does not send when resumeFromChunk is 0", async () => {
      const offer = createOfferMessage();
      await receiver.handleOffer(offer);

      receiver.sendResumeFrom();
      expect(conn.send).not.toHaveBeenCalled();
    });

    it("does not send when no connection is set", async () => {
      const receiver2 = new FileReceiver();
      mockGetLastReceivedChunkIndex.mockResolvedValue(4);
      const offer = createOfferMessage();
      await receiver2.handleOffer(offer);

      receiver2.sendResumeFrom(); // no connection
      // Should not throw
    });
  });

  describe("idempotency and probes (Task 2)", () => {
    beforeEach(async () => {
      const offer = createOfferMessage({ totalChunks: 5 });
      await receiver.handleOffer(offer);
    });

    it("skips storage write for duplicate chunks but sends ACK", async () => {
      await receiver.handleChunk(createChunkMessage(0));
      expect(mockAddChunk).toHaveBeenCalledTimes(1);
      conn.send.mockClear();

      // Send same chunk again
      await receiver.handleChunk(createChunkMessage(0));

      // Should NOT call addChunk again
      expect(mockAddChunk).toHaveBeenCalledTimes(1);
      // Should STILL send ACK
      expect(conn.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: "chunk-ack", payload: { chunkIndex: 0 } })
      );
    });

    it("handles chunk-probe identically to chunk", async () => {
      const probeMsg = {
        ...createChunkMessage(1),
        type: "chunk-probe" as const,
      };

      await receiver.handleChunk(probeMsg);

      expect(mockAddChunk).toHaveBeenCalledTimes(1);
      expect(conn.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: "chunk-ack", payload: { chunkIndex: 1 } })
      );
    });

    it("does not drop out-of-order chunks as duplicates", async () => {
      const offer = createOfferMessage({ totalChunks: 3, fileSize: 65536 * 3 });
      await receiver.handleOffer(offer);

      const completeCb = vi.fn();
      receiver.onComplete(completeCb);

      // Deliberately send out of order: old resumeFrom logic could incorrectly skip chunk 0.
      await receiver.handleChunk(createChunkMessage(1));
      await receiver.handleChunk(createChunkMessage(0));
      await receiver.handleChunk(createChunkMessage(2));

      expect(mockAddChunk).toHaveBeenCalledTimes(3);
      expect(completeCb).toHaveBeenCalledWith(expect.any(Blob), "document.pdf");
    });
  });
});
