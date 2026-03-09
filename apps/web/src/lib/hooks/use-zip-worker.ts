/**
 * React hook for ZIP worker
 *
 * Provides a simple API for compressing files using Web Workers.
 */

import { useEffect, useRef } from "react";
import { WorkerPool } from "@/lib/utils/worker-pool";

export function useZipWorker() {
  const workerPoolRef = useRef<WorkerPool | null>(null);

  useEffect(() => {
    // Initialize worker pool
    workerPoolRef.current = new WorkerPool(() => {
      return new Worker(new URL("@/workers/zip.worker.ts", import.meta.url));
    });

    // Cleanup on unmount
    return () => {
      workerPoolRef.current?.terminate();
    };
  }, []);

  const zipFiles = async (
    files: Array<{ path: string; data: Uint8Array; mtime?: number }>,
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> => {
    if (!workerPoolRef.current) {
      throw new Error("Worker not initialized");
    }

    const result = await workerPoolRef.current.execute<{ data: Uint8Array }>(
      "zip",
      { files },
      onProgress
    );

    return result.data;
  };

  return {
    zipFiles,
  };
}
