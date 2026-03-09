import { zipSync, Zippable } from "fflate";

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for reading files

// Cancellation token
let cancelZipping = false;

export function cancelZip() {
  cancelZipping = true;
}

/**
 * Zips multiple files into a single ZIP file with chunked reading to reduce memory pressure.
 * Uses 'Store' (level 0) compression for speed and low CPU usage.
 *
 * Memory-efficient approach:
 * - Reads files in 1MB chunks sequentially
 * - Processes one file at a time
 * - Reduces peak memory usage compared to loading all files at once
 */
export async function zipFiles(
  files: File[],
  onProgress?: (percent: number) => void
): Promise<File> {
  cancelZipping = false; // Reset cancellation flag

  const zipData: Zippable = {};
  let totalBytesRead = 0;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Read each file in chunks and store in zipData
  for (const file of files) {
    if (cancelZipping) {
      throw new Error("Zipping cancelled by user");
    }

    const path = file.webkitRelativePath || file.name;
    const fileChunks: Uint8Array[] = [];
    let offset = 0;

    // Read file in chunks
    while (offset < file.size) {
      if (cancelZipping) {
        throw new Error("Zipping cancelled by user");
      }

      const chunk = file.slice(offset, offset + CHUNK_SIZE);

      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(chunk);
      });

      const uint8Array = new Uint8Array(arrayBuffer);
      fileChunks.push(uint8Array);

      offset += CHUNK_SIZE;
      totalBytesRead += uint8Array.length;

      // Report progress during reading
      if (onProgress) {
        const progress = Math.min(95, Math.floor((totalBytesRead / totalSize) * 95));
        onProgress(progress);
      }
    }

    // Concatenate chunks for this file
    const totalLength = fileChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const fileData = new Uint8Array(totalLength);
    let position = 0;
    for (const chunk of fileChunks) {
      fileData.set(chunk, position);
      position += chunk.length;
    }

    zipData[path] = [
      fileData,
      {
        level: 0,
        mtime: file.lastModified ? new Date(file.lastModified) : new Date(),
      },
    ];
  }

  if (cancelZipping) {
    throw new Error("Zipping cancelled by user");
  }

  // Create ZIP synchronously (fast with level 0)
  if (onProgress) onProgress(98);
  const zipped = zipSync(zipData, { level: 0 });

  // Create File object - cast to satisfy TypeScript's strict BlobPart type
  const zipBlob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
  const zipFile = new File([zipBlob], `archive_${Date.now()}.zip`, { type: "application/zip" });

  if (onProgress) onProgress(100);
  return zipFile;
}

/**
 * recursively extracts files from DataTransferItems (drag and drop).
 */
export async function getFilesFromDataTransferItems(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = [];
  const queue: (FileSystemEntry | null)[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i].webkitGetAsEntry?.() || null;
    if (item) queue.push(item);
  }

  while (queue.length > 0) {
    const entry = queue.shift();
    if (!entry) continue;

    if (entry.isFile) {
      const file = await new Promise<File | null>((resolve) => {
        (entry as FileSystemFileEntry).file(
          (f) => {
            // Manually property define webkitRelativePath because FileSystemEntry doesn't set it perfect for root files sometimes
            // But we actually want the full path from the root of the drag.
            // entry.fullPath usually starts with /. Remove it.
            const path = entry.fullPath.startsWith("/") ? entry.fullPath.slice(1) : entry.fullPath;
            // Define a property on the file object to store this path
            Object.defineProperty(f, "webkitRelativePath", {
              value: path,
              writable: true,
            });
            resolve(f);
          },
          () => resolve(null)
        );
      });
      if (file) files.push(file);
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        const result: FileSystemEntry[] = [];
        const readEntries = () => {
          dirReader.readEntries(
            (batch) => {
              if (batch.length === 0) {
                resolve(result);
              } else {
                result.push(...batch);
                readEntries(); // Continue reading
              }
            },
            (err) => reject(err)
          );
        };
        readEntries();
      });
      queue.push(...entries);
    }
  }

  return files;
}
