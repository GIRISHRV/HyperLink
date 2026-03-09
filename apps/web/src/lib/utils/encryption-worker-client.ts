/**
 * Encryption Worker Client (non-React)
 *
 * Provides encryption/decryption using Web Workers for non-React contexts
 * like the FileSender and FileReceiver classes.
 */

import { WorkerPool } from "./worker-pool";

class EncryptionWorkerClient {
  private workerPool: WorkerPool | null = null;

  private ensureWorker(): WorkerPool {
    if (!this.workerPool) {
      this.workerPool = new WorkerPool(() => {
        return new Worker(new URL("@/workers/encryption.worker.ts", import.meta.url));
      });
    }
    return this.workerPool;
  }

  async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    const pool = this.ensureWorker();
    // Pass Uint8Array directly, structured clone will handle it
    return pool.execute("deriveKey", { password, salt });
  }

  async encrypt(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    // CryptoKey cannot be reliably transferred to workers, use main thread
    const { encryptChunk } = await import("@/lib/utils/crypto");
    return encryptChunk(data, key);
  }

  async decrypt(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    // CryptoKey cannot be reliably transferred to workers, use main thread
    const { decryptChunk } = await import("@/lib/utils/crypto");
    return decryptChunk(data, key);
  }

  terminate() {
    this.workerPool?.terminate();
    this.workerPool = null;
  }
}

// Singleton instance
export const encryptionWorkerClient = new EncryptionWorkerClient();
