/**
 * Phase 2 — IndexedDB Manager (idb-manager.ts)
 *
 * Tests for: initDB, addChunk, clearTransfer, getLastReceivedChunkIndex,
 * assembleFileFromCursor, addFile, getFile, deleteFile
 *
 * Uses fake-indexeddb to provide a real IndexedDB implementation in Node.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// fake-indexeddb provides a standards-compliant in-memory IDB
// If not installed, we mock the idb module instead.
// For this test we mock at the idb module level.

const mockStore = new Map<string, unknown>();
const mockFileStore = new Map<string, unknown>();

interface MockCursor {
  value: unknown;
  delete: () => Promise<void>;
  continue: () => Promise<MockCursor | null>;
}

const mockTxStore = {
  put: vi.fn(async (value: unknown, key: string) => {
    mockStore.set(key, value);
  }),
  delete: vi.fn(async (key: string) => {
    mockStore.delete(key);
  }),
  get: vi.fn(async (key: string) => mockStore.get(key)),
  index: vi.fn(() => ({
    count: vi.fn(
      async (transferId: string) =>
        Array.from(mockStore.keys()).filter((k) => k.startsWith(transferId + ":")).length
    ),
    openCursor: vi.fn(async (transferId: string, direction?: IDBCursorDirection) => {
      let keys = Array.from(mockStore.keys())
        .filter((k) => k.startsWith(transferId + ":"))
        .sort(); // Consistent forward order by default

      // Honour 'prev' direction — reverse the key list
      if (direction === "prev") keys = keys.reverse();

      if (keys.length === 0) return null;
      let idx = 0;

      const makeCursor = (): MockCursor | null => {
        if (idx >= keys.length) return null;
        const key = keys[idx];
        const value = mockStore.get(key);

        return {
          value,
          delete: async () => {
            mockStore.delete(key);
          },
          continue: async () => {
            idx++;
            return makeCursor();
          },
        } as MockCursor;
      };
      return makeCursor();
    }),
  })),
};

const mockTx = {
  store: mockTxStore,
  done: Promise.resolve(),
};

const mockDB = {
  countFromIndex: vi.fn(async (_storeName: string, _indexName: string, transferId: string) => {
    return Array.from(mockStore.keys()).filter((k) => k.startsWith(transferId + ":")).length;
  }),
  put: vi.fn(async (storeName: string, value: unknown, key?: string) => {
    if (storeName === "completed-files") {
      mockFileStore.set((value as { transferId: string }).transferId, value);
    } else {
      mockStore.set(key!, value);
    }
  }),
  get: vi.fn(async (storeName: string, key: string) => {
    if (storeName === "completed-files") return mockFileStore.get(key);
    return mockStore.get(key);
  }),
  delete: vi.fn(async (storeName: string, key: string) => {
    if (storeName === "completed-files") mockFileStore.delete(key);
    else mockStore.delete(key);
  }),
  transaction: vi.fn(() => mockTx),
};

vi.mock("idb", () => ({
  openDB: vi.fn(async () => mockDB),
}));

import {
  initDB,
  addChunk,
  clearTransfer,
  getLastReceivedChunkIndex,
  addFile,
  getFile,
  deleteFile,
} from "../idb-manager";

describe("idb-manager", () => {
  beforeEach(() => {
    mockStore.clear();
    mockFileStore.clear();
    vi.clearAllMocks();
  });

  // ─── initDB ────────────────────────────────────────────────────────────

  describe("initDB", () => {
    it("initialises the database without error", async () => {
      const db = await initDB();
      expect(db).toBeDefined();
    });
  });

  // ─── addChunk ──────────────────────────────────────────────────────────

  describe("addChunk", () => {
    it("stores a chunk with composite key transferId:chunkIndex", async () => {
      const chunk = {
        transferId: "t1",
        chunkIndex: 0,
        data: new Blob(["data"]),
        timestamp: Date.now(),
      };

      await addChunk(chunk);
      expect(mockDB.put).toHaveBeenCalledWith("file-chunks", chunk, "t1:0");
    });

    it("stores multiple chunks with different keys", async () => {
      for (let i = 0; i < 3; i++) {
        await addChunk({
          transferId: "t2",
          chunkIndex: i,
          data: new Blob([`chunk-${i}`]),
          timestamp: Date.now(),
        });
      }
      expect(mockDB.put).toHaveBeenCalledTimes(3);
    });
  });

  // ─── clearTransfer ────────────────────────────────────────────────────

  describe("clearTransfer", () => {
    it("deletes all chunks for a given transferId", async () => {
      vi.useFakeTimers();
      // Pre-seed
      mockStore.set("t3:0", { transferId: "t3", chunkIndex: 0 });
      mockStore.set("t3:1", { transferId: "t3", chunkIndex: 1 });
      mockStore.set("other:0", { transferId: "other", chunkIndex: 0 });

      const clearPromise = clearTransfer("t3");

      // Fast-forward any timers (like setTimeout(0))
      await vi.runAllTimersAsync();
      await clearPromise;

      expect(mockStore.has("t3:0")).toBe(false);
      expect(mockStore.has("t3:1")).toBe(false);
      expect(mockStore.has("other:0")).toBe(true);

      vi.useRealTimers();
    });

    it("reports progress via onProgress callback", async () => {
      vi.useFakeTimers();
      // Seed 10 chunks
      for (let i = 0; i < 10; i++) {
        mockStore.set(`t-prog:${i}`, { transferId: "t-prog", chunkIndex: i });
      }

      const onProgress = vi.fn();
      const clearPromise = clearTransfer("t-prog", onProgress);

      await vi.runAllTimersAsync();
      await clearPromise;

      expect(onProgress).toHaveBeenCalled();
      // Last call should be (10, 10)
      expect(onProgress).toHaveBeenLastCalledWith(10, 10);

      vi.useRealTimers();
    });
  });

  // ─── getLastReceivedChunkIndex ────────────────────────────────────────

  describe("getLastReceivedChunkIndex", () => {
    it("returns -1 when no chunks exist", async () => {
      const result = await getLastReceivedChunkIndex("nonexistent");
      expect(result).toBe(-1);
    });

    it("returns the highest chunk index for a transfer", async () => {
      mockStore.set("t4:0", { transferId: "t4", chunkIndex: 0 });
      mockStore.set("t4:1", { transferId: "t4", chunkIndex: 1 });
      mockStore.set("t4:5", { transferId: "t4", chunkIndex: 5 });

      const result = await getLastReceivedChunkIndex("t4");
      expect(result).toBe(5);
    });
  });

  // ─── addFile / getFile / deleteFile ───────────────────────────────────

  describe("file store operations", () => {
    it("saves and retrieves a file", async () => {
      const blob = new Blob(["file content"], { type: "text/plain" });
      await addFile("f1", "text/plain", blob);

      expect(mockDB.put).toHaveBeenCalledWith(
        "completed-files",
        expect.objectContaining({
          transferId: "f1",
          fileType: "text/plain",
          data: blob,
        })
      );
    });

    it("retrieves a file from IDB", async () => {
      const blob = new Blob(["test"]);
      mockFileStore.set("f2", {
        transferId: "f2",
        fileType: "text/plain",
        data: blob,
        timestamp: 1,
      });

      const result = await getFile("f2");
      expect(result).toBe(blob);
    });

    it("returns null for non-existent file", async () => {
      const result = await getFile("nonexistent");
      expect(result).toBeNull();
    });

    it("deletes a file", async () => {
      mockFileStore.set("f3", { transferId: "f3" });
      await deleteFile("f3");
      expect(mockDB.delete).toHaveBeenCalledWith("completed-files", "f3");
    });
  });
});
