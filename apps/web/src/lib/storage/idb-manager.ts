import { openDB, type IDBPDatabase } from "idb";
import type { FileChunk } from "@repo/types";
import { logger } from "@repo/utils";

const DB_NAME = "hyperlink-storage";
const CHUNK_STORE = "file-chunks";
const FILE_STORE = "completed-files";
const DB_VERSION = 2; // Bump version for new store

interface AppDB {
  [CHUNK_STORE]: {
    key: string; // Format: "transferId:chunkIndex"
    value: FileChunk;
    indexes: { transferId: string };
  };
  [FILE_STORE]: {
    key: string; // transferId
    value: {
      transferId: string;
      fileType: string;
      data: Blob;
      timestamp: number;
    };
  };
}

let dbInstance: IDBPDatabase<AppDB> | null = null;

/**
 * Initialize IndexedDB connection
 */
export const initDB = async () => {
  return openDB<any>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(CHUNK_STORE);
        store.createIndex("transferId", "transferId", { unique: false });
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(FILE_STORE)) {
          db.createObjectStore(FILE_STORE, { keyPath: "transferId" });
        }
      }
    },
    blocked() {
      console.warn("[IDB] DB Open Blocked: Close other tabs with this app open!");
    },
    blocking() {
      console.warn("[IDB] DB Open Blocking: Reloading...");
      window.location.reload();
    },
    terminated() {
      console.error("[IDB] DB Connection Terminated");
    },
  });
};

async function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (dbInstance) return dbInstance;
  dbInstance = await initDB(); // Use the new initDB function
  return dbInstance;
}

/**
 * Add a chunk to IndexedDB (CRITICAL: Direct-to-disk, no memory accumulation)
 */
export async function addChunk(chunk: FileChunk): Promise<void> {
  const db = await getDB();
  const key = `${chunk.transferId}:${chunk.chunkIndex} `;
  await db.put(CHUNK_STORE, chunk, key);
}

/**
 * Get all chunks for a transfer (only called once at 100% complete)
 */
export async function getAllChunks(transferId: string): Promise<FileChunk[]> {
  const db = await getDB();
  const tx = db.transaction(CHUNK_STORE, "readonly");
  const index = tx.store.index("transferId");
  const chunks = await index.getAll(transferId);
  await tx.done;

  // Sort by chunk index to ensure correct order
  return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
}

/**
 * Clear all chunks for a transfer (called after download complete)
 */
export async function clearTransfer(transferId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(CHUNK_STORE, "readwrite");
  const index = tx.store.index("transferId");
  const keys = await index.getAllKeys(transferId);

  for (const key of keys) {
    await tx.store.delete(key);
  }

  await tx.done;
}

/**
 * Get chunk count for a transfer (for progress tracking)
 */
export async function getChunkCount(transferId: string): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(CHUNK_STORE, "readonly");
  const index = tx.store.index("transferId");
  const count = await index.count(transferId);
  await tx.done;
  return count;
}

/**
 * Get the highest chunk index received for a transfer (for resumption)
 * Returns -1 if no chunks exist
 */
export async function getLastReceivedChunkIndex(transferId: string): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(CHUNK_STORE, "readonly");
  const index = tx.store.index("transferId");
  const chunks = await index.getAll(transferId);
  await tx.done;

  if (chunks.length === 0) return -1;

  // Find the highest chunk index
  return Math.max(...chunks.map((c) => c.chunkIndex));
}

/**
 * Check if a specific chunk exists
 */
export async function hasChunk(transferId: string, chunkIndex: number): Promise<boolean> {
  const db = await getDB();
  const key = `${transferId}:${chunkIndex} `;
  const chunk = await db.get(CHUNK_STORE, key);
  return !!chunk;
}

/**
 * Get storage usage estimate
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { usage: 0, quota: 0 };
}

// --- File Storage Methods (New) ---

/**
 * Save a completed file to IndexedDB
 */
export async function addFile(transferId: string, fileType: string, data: Blob): Promise<void> {
  try {
    const db = await getDB();
    await db.put(FILE_STORE, {
      transferId,
      fileType,
      data,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err, transferId }, "Failed to save file to IDB");
    throw err;
  }
}

/**
 * Retrieve a file blob from IndexedDB
 */
export async function getFile(transferId: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    const record = await db.get(FILE_STORE, transferId);
    return record ? record.data : null;
  } catch (err) {
    logger.error({ err, transferId }, "Failed to retrieve file from IDB");
    throw err;
  }
}

/**
 * Check if a file exists in storage
 */
export async function hasFile(transferId: string): Promise<boolean> {
  const db = await getDB();
  const record = await db.get(FILE_STORE, transferId);
  return !!record;
}

/**
 * Delete a completed file from storage
 */
export async function deleteFile(transferId: string): Promise<void> {
  const db = await getDB();
  await db.delete(FILE_STORE, transferId);
}
