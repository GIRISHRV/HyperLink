import { openDB, type IDBPDatabase } from "idb";
import type { FileChunk } from "@repo/types";

const DB_NAME = "hyperlink-storage";
const STORE_NAME = "file-chunks";
const DB_VERSION = 1;

interface ChunkDB {
  "file-chunks": {
    key: string; // Format: "transferId:chunkIndex"
    value: FileChunk;
    indexes: { transferId: string };
  };
}

let dbInstance: IDBPDatabase<ChunkDB> | null = null;

/**
 * Initialize IndexedDB connection
 */
async function getDB(): Promise<IDBPDatabase<ChunkDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ChunkDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME);
        store.createIndex("transferId", "transferId", { unique: false });
      }
    },
  });

  return dbInstance;
}

/**
 * Add a chunk to IndexedDB (CRITICAL: Direct-to-disk, no memory accumulation)
 */
export async function addChunk(chunk: FileChunk): Promise<void> {
  const db = await getDB();
  const key = `${chunk.transferId}:${chunk.chunkIndex}`;
  await db.put(STORE_NAME, chunk, key);
}

/**
 * Get all chunks for a transfer (only called once at 100% complete)
 */
export async function getAllChunks(transferId: string): Promise<FileChunk[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
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
  const tx = db.transaction(STORE_NAME, "readwrite");
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
  const tx = db.transaction(STORE_NAME, "readonly");
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
  const tx = db.transaction(STORE_NAME, "readonly");
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
  const key = `${transferId}:${chunkIndex}`;
  const chunk = await db.get(STORE_NAME, key);
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
