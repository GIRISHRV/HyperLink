/**
 * Encryption Web Worker
 *
 * Handles CPU-intensive encryption/decryption operations in a background thread
 * to prevent UI blocking during large file transfers.
 */

import { deriveKey, encryptChunk, decryptChunk } from "@/lib/utils/crypto";

export interface EncryptionWorkerMessage {
  id: string;
  type: "encrypt" | "decrypt" | "deriveKey";
  payload: {
    data?: ArrayBuffer;
    password?: string;
    salt?: Uint8Array;
    key?: CryptoKey;
  };
}

export interface EncryptionWorkerResponse {
  id: string;
  type: "success" | "error";
  payload?: {
    data?: ArrayBuffer;
    key?: CryptoKey;
    salt?: Uint8Array;
  };
  error?: string;
}

const ctx = self as any;

// Handle messages from main thread
ctx.onmessage = async (event: MessageEvent<EncryptionWorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case "deriveKey": {
        if (!payload.password || !payload.salt) {
          throw new Error("Password and salt required for key derivation");
        }
        // payload.salt is already a Uint8Array from structured clone
        const key = await deriveKey(payload.password, payload.salt);
        const response: EncryptionWorkerResponse = {
          id,
          type: "success",
          payload: { key, salt: payload.salt },
        };
        // CryptoKey and Uint8Array are cloneable but not transferable
        ctx.postMessage(response);
        break;
      }

      case "encrypt": {
        if (!payload.data || !payload.key) {
          throw new Error("Data and key required for encryption");
        }
        const encrypted = await encryptChunk(payload.data, payload.key);
        const response: EncryptionWorkerResponse = {
          id,
          type: "success",
          payload: { data: encrypted },
        };

        const transferables: Transferable[] = [];
        if (encrypted instanceof ArrayBuffer) {
          transferables.push(encrypted);
        } else if (encrypted && (encrypted as any).buffer instanceof ArrayBuffer) {
          transferables.push((encrypted as any).buffer);
        }

        // Use transferable objects for performance
        ctx.postMessage(response, transferables);
        break;
      }

      case "decrypt": {
        if (!payload.data || !payload.key) {
          throw new Error("Data and key required for decryption");
        }
        const decrypted = await decryptChunk(payload.data, payload.key);
        const response: EncryptionWorkerResponse = {
          id,
          type: "success",
          payload: { data: decrypted },
        };

        const transferables: Transferable[] = [];
        if (decrypted instanceof ArrayBuffer) {
          transferables.push(decrypted);
        } else if (decrypted && (decrypted as any).buffer instanceof ArrayBuffer) {
          transferables.push((decrypted as any).buffer);
        }

        // Use transferable objects for performance
        ctx.postMessage(response, transferables);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const response: EncryptionWorkerResponse = {
      id,
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };
    ctx.postMessage(response);
  }
};

// Export empty object to make this a module
export {};
