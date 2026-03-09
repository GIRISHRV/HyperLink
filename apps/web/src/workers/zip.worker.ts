/**
 * ZIP Web Worker
 *
 * Handles CPU-intensive ZIP compression operations in a background thread
 * to prevent UI blocking during multi-file transfers.
 */

import { zipSync, Zippable } from "fflate";

export interface ZipWorkerMessage {
  id: string;
  type: "zip";
  payload: {
    files: Array<{
      path: string;
      data: Uint8Array;
      mtime?: number;
    }>;
  };
}

export interface ZipWorkerResponse {
  id: string;
  type: "success" | "error" | "progress";
  payload?: {
    data?: Uint8Array;
    progress?: number;
  };
  error?: string;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<ZipWorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    if (type !== "zip") {
      throw new Error(`Unknown message type: ${type}`);
    }

    const { files } = payload;
    const zipData: Zippable = {};

    // Build zip data structure
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      zipData[file.path] = [
        file.data,
        {
          level: 0, // No compression for speed
          mtime: file.mtime ? new Date(file.mtime) : new Date(),
        },
      ];

      // Report progress
      const progress = Math.floor(((i + 1) / files.length) * 50); // 0-50% for preparation
      const progressResponse: ZipWorkerResponse = {
        id,
        type: "progress",
        payload: { progress },
      };
      self.postMessage(progressResponse);
    }

    // Perform ZIP compression
    const progressResponse: ZipWorkerResponse = {
      id,
      type: "progress",
      payload: { progress: 75 },
    };
    self.postMessage(progressResponse);

    const zipped = zipSync(zipData, { level: 0 });

    // Send final result
    const response: ZipWorkerResponse = {
      id,
      type: "success",
      payload: {
        data: zipped,
        progress: 100,
      },
    };
    // Use transferable objects for performance
    self.postMessage(response, [zipped.buffer]);
  } catch (error) {
    const response: ZipWorkerResponse = {
      id,
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};

// Export empty object to make this a module
export {};
