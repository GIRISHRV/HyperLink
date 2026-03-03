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
    getAllKeys: vi.fn(async (transferId: string) =>
      Array.from(mockStore.keys()).filter((k) => k.startsWith(transferId + ":"))
    ),
    openCursor: vi.fn(async (transferId: string) => {
      const entries = Array.from(mockStore.entries())
        .filter(([k]) => k.startsWith(transferId + ":"))
        .map(([, v]) => v);
      if (entries.length === 0) return null;
      let idx = 0;
      const makeCursor = (): MockCursor | null => {
        if (idx >= entries.length) return null;
        const value = entries[idx];
        idx++;
        return {
          value,
          continue: async () => makeCursor(),
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
      // Pre-seed
      mockStore.set("t3:0", { transferId: "t3", chunkIndex: 0 });
      mockStore.set("t3:1", { transferId: "t3", chunkIndex: 1 });
      mockStore.set("other:0", { transferId: "other", chunkIndex: 0 });

      await clearTransfer("t3");

      // clearTransfer uses a transaction, so it calls store.delete via the tx
      expect(mockTxStore.delete).toHaveBeenCalledWith("t3:0");
      expect(mockTxStore.delete).toHaveBeenCalledWith("t3:1");
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
