/**
 * React hook for encryption worker
 *
 * Provides a simple API for encrypting/decrypting data using Web Workers.
 */

import { useEffect, useRef } from "react";
import { WorkerPool } from "@/lib/utils/worker-pool";

export function useEncryptionWorker() {
  const workerPoolRef = useRef<WorkerPool | null>(null);

  useEffect(() => {
    // Initialize worker pool
    workerPoolRef.current = new WorkerPool(() => {
      return new Worker(new URL("@/workers/encryption.worker.ts", import.meta.url));
    });

    // Cleanup on unmount
    return () => {
      workerPoolRef.current?.terminate();
    };
  }, []);

  const deriveKey = async (
    password: string,
    salt: ArrayBuffer
  ): Promise<{ key: CryptoKey; salt: ArrayBuffer }> => {
    if (!workerPoolRef.current) {
      throw new Error("Worker not initialized");
    }

    return workerPoolRef.current.execute("deriveKey", { password, salt }, undefined, [salt]);
  };

  const encrypt = async (
    data: ArrayBuffer,
    key: CryptoKey,
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> => {
    if (!workerPoolRef.current) {
      throw new Error("Worker not initialized");
    }

    const result = await workerPoolRef.current.execute<{ data: ArrayBuffer }>(
      "encrypt",
      { data, key },
      onProgress,
      [data]
    );

    return result.data;
  };

  const decrypt = async (
    data: ArrayBuffer,
    key: CryptoKey,
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> => {
    if (!workerPoolRef.current) {
      throw new Error("Worker not initialized");
    }

    const result = await workerPoolRef.current.execute<{ data: ArrayBuffer }>(
      "decrypt",
      { data, key },
      onProgress,
      [data]
    );

    return result.data;
  };

  return {
    deriveKey,
    encrypt,
    decrypt,
  };
}
