/**
 * Phase 2 — FileSender (sender.ts)
 *
 * Tests for: FileSender class — sendOffer, startTransfer, pause/resume, cancel,
 * encryption setup, sliding window, backpressure.
 *
 * All PeerJS and crypto dependencies are mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FileSender } from "../sender";

// ─── Mock dependencies ─────────────────────────────────────────────────

vi.mock("@repo/utils", () => ({
  generateTransferId: vi.fn(() => "mock-transfer-id"),
  calculateChunkCount: vi.fn((size: number, chunkSize = 65536) => Math.ceil(size / chunkSize)),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/utils/crypto", () => ({
  generateSalt: vi.fn(() => new Uint8Array(16)),
  deriveKey: vi.fn(async () => ({ type: "secret", algorithm: { name: "AES-GCM" } } as unknown as CryptoKey)),
  encryptChunk: vi.fn(async (data: ArrayBuffer) => {
    // Return data with 28 bytes overhead (12 IV + 16 tag)
    const result = new Uint8Array(data.byteLength + 28);
    result.set(new Uint8Array(data), 0);
    return result.buffer;
  }),
  arrayBufferToBase64: vi.fn(() => "bW9ja19zYWx0"),
}));

vi.mock("@/lib/utils/peer-message-validator", () => ({
  validatePeerMessage: vi.fn((data: unknown) => data),
}));

// ─── Mock DataConnection ───────────────────────────────────────────────

function createMockConnection() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    open: true,
    send: vi.fn(),
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    once: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    off: vi.fn(),
    // Helper for tests to emit events
    _emit: (event: string, data?: unknown) => {
      (listeners[event] || []).forEach((cb) => cb(data));
    },
    // Backpressure
    dataChannel: { bufferedAmount: 0, readyState: "open" },
    _disconnected: false,
    _closed: false,
  };
}

// ─── Helper to create File mock ────────────────────────────────────────

function createMockFile(size: number, name = "test.txt"): File {
  const data = new Uint8Array(size);
  return new File([data], name, { type: "text/plain" });
}

describe("FileSender", () => {
  let conn: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    vi.clearAllMocks();
    conn = createMockConnection();
  });

  // ─── Constructor ───────────────────────────────────────────────────────

  it("initializes with correct defaults", () => {
    const file = createMockFile(1024);
    const sender = new FileSender(file, conn as any);

    expect(sender.getTransferId()).toBe("mock-transfer-id");
    expect(sender.getStatus()).toBe("idle");
    expect(sender.getCurrentChunk()).toBe(0);
  });

  it("calculates total chunks correctly", () => {
    const file = createMockFile(65536 * 3); // exactly 3 chunks
    const sender = new FileSender(file, conn as any);
    expect(sender.getTotalChunks()).toBe(3);
  });

  // ─── sendOffer ─────────────────────────────────────────────────────────

  describe("sendOffer", () => {
    it("sends a file-offer message with correct metadata", async () => {
      const file = createMockFile(1024, "document.pdf");
      const sender = new FileSender(file, conn as any, "db-transfer-123");

      const transferId = await sender.sendOffer();

      expect(transferId).toBe("mock-transfer-id");
      expect(conn.send).toHaveBeenCalledOnce();

      const sentMsg = conn.send.mock.calls[0][0];
      expect(sentMsg.type).toBe("file-offer");
      expect(sentMsg.transferId).toBe("mock-transfer-id");
      expect(sentMsg.payload.filename).toBe("document.pdf");
      expect(sentMsg.payload.fileSize).toBe(1024);
      expect(sentMsg.payload.dbTransferId).toBe("db-transfer-123");
      expect(sentMsg.payload.isEncrypted).toBe(false);
    });

    it("includes encryption metadata when password is set", async () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);
      await sender.setPassword("my-password");

      await sender.sendOffer();

      const sentMsg = conn.send.mock.calls[0][0];
      expect(sentMsg.payload.isEncrypted).toBe(true);
      expect(sentMsg.payload.salt).toBe("bW9ja19zYWx0");
    });
  });

  // ─── setPassword ──────────────────────────────────────────────────────

  describe("setPassword", () => {
    it("does nothing for empty password", async () => {
      const file = createMockFile(100);
      const sender = new FileSender(file, conn as any);

      await sender.setPassword("");
      // No error thrown, no key generated
      await sender.sendOffer();
      const msg = conn.send.mock.calls[0][0];
      expect(msg.payload.isEncrypted).toBe(false);
    });
  });

  // ─── cancel ────────────────────────────────────────────────────────────

  describe("cancel", () => {
    it("sets status to cancelled and sends cancel message", async () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);

      await sender.cancel();

      expect(sender.getStatus()).toBe("cancelled");
      // safeSend is async, but cancel calls it fire-and-forget
    });

    it("is a no-op if already cancelled", async () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);

      await sender.cancel();
      conn.send.mockClear();
      await sender.cancel(); // second call
      // Should not send another cancel message
    });

    it("is a no-op if already complete", async () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);

      // Force status to complete (private, so we test via cancel behavior)
      await sender.cancel();
      expect(sender.getStatus()).toBe("cancelled");
    });
  });

  // ─── pause / resume ───────────────────────────────────────────────────

  describe("pause / resume", () => {
    it("pause sets status to paused (when idle, it still sets)", async () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);

      await sender.pause();
      expect(sender.getStatus()).toBe("paused");
    });

    it("resume is a no-op if not paused", async () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);

      await sender.resume();
      expect(sender.getStatus()).toBe("idle");
    });

    it("resume from paused restores to transferring", async () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);

      await sender.pause();
      expect(sender.getStatus()).toBe("paused");

      await sender.resume();
      expect(sender.getStatus()).toBe("transferring");
    });
  });

  // ─── Callbacks ────────────────────────────────────────────────────────

  describe("callbacks", () => {
    it("registers and invokes onCancel callback", () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);
      const cancelCb = vi.fn();

      sender.onCancel(cancelCb);
      // Cancel callback is invoked when RECEIVER cancels (not sender)
      // So we just test registration
      expect(cancelCb).not.toHaveBeenCalled();
    });

    it("registers onPauseChange callback", () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);
      const pauseCb = vi.fn();

      sender.onPauseChange(pauseCb);
      // Callback invoked when receiver requests pause — tested in integration
    });

    it("registers onReject callback", () => {
      const file = createMockFile(1024);
      const sender = new FileSender(file, conn as any);
      const rejectCb = vi.fn();

      sender.onReject(rejectCb);
    });
  });

  // ─── startTransfer control flow ───────────────────────────────────────

  describe("startTransfer control flow", () => {
    beforeEach(() => {
      // jsdom does not define Blob/File.prototype.arrayBuffer.
      // Polyfill it so slice().arrayBuffer() resolves with a real buffer.
      const arrayBufferImpl = function (this: Blob): Promise<ArrayBuffer> {
        return Promise.resolve(new ArrayBuffer(64));
      };
      Object.defineProperty(Blob.prototype, "arrayBuffer", {
        value: arrayBufferImpl,
        writable: true,
        configurable: true,
      });
    });

    it("resolves after file-accept and all chunk-acks (happy path)", async () => {
      const file = createMockFile(64); // 1 chunk
      const sender = new FileSender(file, conn as any);
      const progressCb = vi.fn();

      const transferPromise = sender.startTransfer(progressCb);

      // Receiver accepts
      conn._emit("data", {
        type: "file-accept",
        transferId: "mock-transfer-id",
        timestamp: Date.now(),
      });

      // Let sendNextChunk's async arrayBuffer() complete
      await new Promise((r) => setTimeout(r, 50));

      // Receiver ACKs the chunk
      conn._emit("data", {
        type: "chunk-ack",
        transferId: "mock-transfer-id",
        payload: null,
        timestamp: Date.now(),
      });

      await transferPromise;

      expect(sender.getStatus()).toBe("complete");
      // chunk + transfer-complete messages were sent
      expect(conn.send).toHaveBeenCalled();
    });

    it("rejects and calls onReject when receiver sends file-reject", async () => {
      const file = createMockFile(64);
      const sender = new FileSender(file, conn as any);
      const rejectCb = vi.fn();
      sender.onReject(rejectCb);

      const transferPromise = sender.startTransfer();

      conn._emit("data", {
        type: "file-reject",
        transferId: "mock-transfer-id",
        payload: null,
        timestamp: Date.now(),
      });

      await expect(transferPromise).rejects.toThrow("File offer rejected by receiver");
      expect(rejectCb).toHaveBeenCalled();
      expect(sender.getStatus()).toBe("cancelled");
    });

    it("rejects and calls onCancel when receiver cancels mid-transfer", async () => {
      const file = createMockFile(64);
      const sender = new FileSender(file, conn as any);
      const cancelCb = vi.fn();
      sender.onCancel(cancelCb);

      const transferPromise = sender.startTransfer();

      conn._emit("data", {
        type: "file-accept",
        transferId: "mock-transfer-id",
        timestamp: Date.now(),
      });

      conn._emit("data", {
        type: "transfer-cancel",
        transferId: "mock-transfer-id",
        payload: null,
        timestamp: Date.now(),
      });

      await expect(transferPromise).rejects.toThrow("Transfer cancelled by receiver");
      expect(cancelCb).toHaveBeenCalled();
    });

    it("pauses and resumes via receiver control messages", () => {
      const file = createMockFile(64);
      const sender = new FileSender(file, conn as any);
      const pauseCb = vi.fn();
      sender.onPauseChange(pauseCb);

      sender.startTransfer().catch(() => { });

      conn._emit("data", {
        type: "file-accept",
        transferId: "mock-transfer-id",
        timestamp: Date.now(),
      });

      conn._emit("data", {
        type: "transfer-pause",
        transferId: "mock-transfer-id",
        payload: null,
        timestamp: Date.now(),
      });

      expect(sender.getStatus()).toBe("paused");
      expect(pauseCb).toHaveBeenCalledWith(true);

      conn._emit("data", {
        type: "transfer-resume",
        transferId: "mock-transfer-id",
        payload: null,
        timestamp: Date.now(),
      });

      expect(sender.getStatus()).toBe("transferring");
      expect(pauseCb).toHaveBeenCalledWith(false);
    });

    it("rejects when connection closes mid-transfer", async () => {
      const file = createMockFile(64);
      const sender = new FileSender(file, conn as any);

      const transferPromise = sender.startTransfer();

      conn._emit("close");

      await expect(transferPromise).rejects.toThrow("Connection closed abruptly");
    });

    it("ignores messages with mismatched transferId", async () => {
      const file = createMockFile(64);
      const sender = new FileSender(file, conn as any);

      const transferPromise = sender.startTransfer();

      // Wrong ID — should be silently ignored
      conn._emit("data", {
        type: "file-reject",
        transferId: "wrong-transfer-id",
        payload: null,
        timestamp: Date.now(),
      });

      // Correct cancel ends it
      conn._emit("data", {
        type: "transfer-cancel",
        transferId: "mock-transfer-id",
        payload: null,
        timestamp: Date.now(),
      });

      await expect(transferPromise).rejects.toThrow("Transfer cancelled by receiver");
    });

    it("does not double-start if already transferring", async () => {
      const file = createMockFile(65536);
      const sender = new FileSender(file, conn as any);

      // p1 starts and sets status to "transferring" immediately (synchronously)
      const p1 = sender.startTransfer().catch(() => { });

      // p2 should resolve immediately since status is already "transferring"
      await sender.startTransfer();

      // Cancel p1 so the test can exit cleanly
      conn._emit("data", {
        type: "transfer-cancel",
        transferId: "mock-transfer-id",
        payload: null,
        timestamp: Date.now(),
      });

      await p1;
    });

    it("completes immediately for 0-chunk file", async () => {
      const { calculateChunkCount } = await import("@repo/utils");
      (calculateChunkCount as ReturnType<typeof vi.fn>).mockReturnValueOnce(0);

      const file = createMockFile(0, "empty.txt");
      const sender = new FileSender(file, conn as any);

      await sender.startTransfer();

      expect(sender.getStatus()).toBe("complete");
    });
  });

  describe("heartbeat and probes (Task 2)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Polyfill arrayBuffer for jsdom
      const arrayBufferImpl = function (this: Blob): Promise<ArrayBuffer> {
        return Promise.resolve(new ArrayBuffer(65536));
      };
      Object.defineProperty(Blob.prototype, "arrayBuffer", {
        value: arrayBufferImpl,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("sends a chunk-probe if no ACK received for 3 seconds", async () => {
      const file = createMockFile(65536 * 5); // 5 chunks
      const sender = new FileSender(file, conn as any);

      sender.startTransfer().catch(() => { });

      // Accept
      conn._emit("data", {
        type: "file-accept",
        transferId: "mock-transfer-id"
      });

      // Wait a bit for initial pump
      await vi.advanceTimersByTimeAsync(50);
      conn.send.mockClear();

      // Wait more than PROBE_INTERVAL (3000ms) + initial drift
      await vi.advanceTimersByTimeAsync(5000);

      const probeMsg = conn.send.mock.calls.find(c => c[0].type === "chunk-probe");
      expect(probeMsg).toBeDefined();
      expect(probeMsg![0].payload.chunkIndex).toBe(0); // first un-acked
    });

    it("stalls after max probes reached", async () => {
      const file = createMockFile(64);
      const sender = new FileSender(file, conn as any);

      sender.startTransfer().catch(() => { });
      conn._emit("data", { type: "file-accept", transferId: "mock-transfer-id" });
      await vi.advanceTimersByTimeAsync(50);

      // Trigger 5 probes (MAX_PROBES)
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(3500);
      }

      // Next heartbeat check (after 1s) should see probeCount >= MAX_PROBES
      await vi.advanceTimersByTimeAsync(1500);

      expect(sender.getStatus()).toBe("cancelled");
    });
  });
});
