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
  return openDB<AppDB>(DB_NAME, DB_VERSION, {
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
      logger.warn({}, "[IDB] DB Open Blocked: Close other tabs with this app open!");
    },
    blocking() {
      logger.warn({}, "[IDB] DB Open Blocking: Closing connection to allow upgrade in other tab");
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    },
    terminated() {
      logger.error({}, "[IDB] DB Connection Terminated");
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
  const key = `${chunk.transferId}:${chunk.chunkIndex}`;
  await db.put(CHUNK_STORE, chunk, key);
}

/**
 * Clear all chunks for a transfer in batches to prevent browser lockup for large files (Task #6)
 */
export async function clearTransfer(
  transferId: string,
  onProgress?: (cleared: number, total: number) => void
): Promise<void> {
  const db = await getDB();
  const BATCH_SIZE = 5000;

  // 1. Get total count for progress reporting
  const total = await db.countFromIndex(CHUNK_STORE, "transferId", transferId);
  if (total === 0) return;

  let cleared = 0;

  while (true) {
    const tx = db.transaction(CHUNK_STORE, "readwrite");
    const index = tx.store.index("transferId");
    let cursor = await index.openCursor(transferId);

    let batchCount = 0;
    while (cursor && batchCount < BATCH_SIZE) {
      await cursor.delete();
      batchCount++;
      cleared++;
      cursor = await cursor.continue();
    }

    await tx.done;

    if (onProgress) {
      onProgress(cleared, total);
    }

    // If we've processed everything, exit
    if (cleared >= total || batchCount < BATCH_SIZE) {
      break;
    }

    // Yield to main thread to permit UI interactions/rendering (Task #6 Requirement)
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  logger.info({ transferId, totalChunks: total }, "[IDB] Successfully cleared transfer chunks");
}

/**
 * Get the highest chunk index received for a transfer (for resumption)
 * Returns -1 if no chunks exist
 */
export async function getLastReceivedChunkIndex(transferId: string): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(CHUNK_STORE, "readonly");
  const index = tx.store.index("transferId");

  let maxIndex = -1;
  let cursor = await index.openCursor(transferId);
  while (cursor) {
    if (cursor.value.chunkIndex > maxIndex) {
      maxIndex = cursor.value.chunkIndex;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return maxIndex;
}

/**
 * Assemble a file progressively using a cursor to avoid V8 heap OOM crashes.
 * Converts ArrayBuffers to Blobs immediately so the browser manages the RAM.
 */
export async function assembleFileFromCursor(transferId: string, fileType: string): Promise<Blob> {
  const db = await getDB();
  const tx = db.transaction(CHUNK_STORE, "readonly");
  const index = tx.store.index("transferId");

  // Get all keys/values is too heavy for 2GB. We use openCursor.
  let cursor = await index.openCursor(transferId);

  // We need to sort chunks, so we must collect them. Since we convert ArrayBuffer 
  // to a Blob immediately, the RAM footprint of this object is minimal.
  const chunkBlobs: { index: number; blob: Blob }[] = [];

  while (cursor) {
    const chunk = cursor.value;
    chunkBlobs.push({
      index: chunk.chunkIndex,
      blob: new Blob([chunk.data], { type: fileType })
    });
    cursor = await cursor.continue();
  }

  // Sort by index
  chunkBlobs.sort((a, b) => a.index - b.index);

  // Combine all small bloblets into one final Blob
  const finalParts = chunkBlobs.map(c => c.blob);
  return new Blob(finalParts, { type: fileType });
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
 * Delete a completed file from storage
 */
export async function deleteFile(transferId: string): Promise<void> {
  const db = await getDB();
  await db.delete(FILE_STORE, transferId);
}
