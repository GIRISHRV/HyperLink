import { zip, Zippable } from 'fflate';

/**
 * Zips multiple files into a single ZIP file.
 * Uses 'Store' (level 0) compression for speed and low CPU usage.
 */
export async function zipFiles(files: File[], onProgress?: (percent: number) => void): Promise<File> {
    return new Promise((resolve, reject) => {
        // 1. Prepare the structure for fflate
        const zipData: Zippable = {};

        // Helper to read file as Uint8Array
        const readFile = (file: File): Promise<Uint8Array> => {
            return new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = () => res(new Uint8Array(reader.result as ArrayBuffer));
                reader.onerror = rej;
                reader.readAsArrayBuffer(file);
            });
        };

        // Read all files into memory (Warning: High memory usage for large files)
        // We strictly rely on the 10GB cap check before calling this.
        const fileReaders = files.map(async (file) => {
            // Use webkitRelativePath if available (from folder selection), otherwise name
            // For standard multi-file select, webkitRelativePath might be empty or same as name.
            // We need to ensure unique paths if names collide in root.
            const path = file.webkitRelativePath || file.name;
            const data = await readFile(file);
            zipData[path] = [data, { level: 0 }]; // Level 0 = Store
        });

        Promise.all(fileReaders).then(() => {
            // Zip it
            zip(zipData, { level: 0 }, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                // Create blob
                const zipBlob = new Blob([data], { type: 'application/zip' });
                const zipFile = new File([zipBlob], `archive_${Date.now()}.zip`, { type: 'application/zip' });
                if (onProgress) onProgress(100);
                resolve(zipFile);
            });
        }).catch(reject);
    });
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
                        const path = entry.fullPath.startsWith('/') ? entry.fullPath.slice(1) : entry.fullPath;
                        // Define a property on the file object to store this path
                        Object.defineProperty(f, 'webkitRelativePath', {
                            value: path,
                            writable: true
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
