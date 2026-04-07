// @vitest-environment node
/**
 * Encryption Integration Test
 *
 * Tests the full encrypt→transmit→decrypt pipeline using actual crypto operations
 * (not mocked). Verifies that sender encryption and receiver decryption work together
 * with the same password.
 *
 * Addresses AUDIT.md §5: "No integration test that encrypts a chunk with sender
 * and decrypts with receiver using the same password"
 */
import { describe, it, expect } from "vitest";
import {
  generateSalt,
  deriveKey,
  encryptChunk,
  decryptChunk,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "@/lib/utils/crypto";

describe("Encryption round-trip integration", () => {
  it("encrypts with sender key and decrypts with receiver key using same password", async () => {
    const password = "shared-secret-password";
    const salt = generateSalt();

    // Sender derives key from password + salt
    const senderKey = await deriveKey(password, salt);

    // Create test data (simulating a file chunk)
    const originalData = new TextEncoder().encode("This is a test file chunk")
      .buffer as ArrayBuffer;

    // Sender encrypts the chunk
    const encryptedChunk = await encryptChunk(originalData, senderKey);

    // Simulate transmission: sender sends salt (as base64) and encrypted chunk
    const saltBase64 = arrayBufferToBase64(salt);

    // Receiver receives salt and derives the same key
    const receivedSalt = base64ToArrayBuffer(saltBase64);
    const receiverKey = await deriveKey(password, receivedSalt);

    // Receiver decrypts the chunk
    const decryptedChunk = await decryptChunk(encryptedChunk, receiverKey);

    // Verify the decrypted data matches the original
    expect(new Uint8Array(decryptedChunk)).toEqual(new Uint8Array(originalData));
  });

  it("fails to decrypt with wrong password", async () => {
    const correctPassword = "correct-password";
    const wrongPassword = "wrong-password";
    const salt = generateSalt();

    // Sender encrypts with correct password
    const senderKey = await deriveKey(correctPassword, salt);
    const originalData = new TextEncoder().encode("Secret data").buffer as ArrayBuffer;
    const encryptedChunk = await encryptChunk(originalData, senderKey);

    // Receiver tries to decrypt with wrong password
    const receiverKey = await deriveKey(wrongPassword, salt);

    // Should throw due to AES-GCM authentication failure
    await expect(decryptChunk(encryptedChunk, receiverKey)).rejects.toThrow();
  });

  it("handles multiple chunks with same password", async () => {
    const password = "multi-chunk-password";
    const salt = generateSalt();
    const senderKey = await deriveKey(password, salt);
    const receiverKey = await deriveKey(password, salt);

    // Simulate 3 chunks
    const chunks = [
      new TextEncoder().encode("Chunk 1 data").buffer as ArrayBuffer,
      new TextEncoder().encode("Chunk 2 data").buffer as ArrayBuffer,
      new TextEncoder().encode("Chunk 3 data").buffer as ArrayBuffer,
    ];

    // Encrypt all chunks
    const encryptedChunks = await Promise.all(
      chunks.map((chunk) => encryptChunk(chunk, senderKey))
    );

    // Decrypt all chunks
    const decryptedChunks = await Promise.all(
      encryptedChunks.map((encrypted) => decryptChunk(encrypted, receiverKey))
    );

    // Verify all chunks match
    decryptedChunks.forEach((decrypted, i) => {
      expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(chunks[i]));
    });
  });

  it("handles large chunk (1MB) encryption round-trip", async () => {
    const password = "large-chunk-password";
    const salt = generateSalt();
    const senderKey = await deriveKey(password, salt);
    const receiverKey = await deriveKey(password, salt);

    // Create 1MB of random data
    const largeChunk = new Uint8Array(1024 * 1024);
    for (let i = 0; i < largeChunk.length; i += 65536) {
      crypto.getRandomValues(largeChunk.subarray(i, i + 65536));
    }

    // Encrypt and decrypt
    const encrypted = await encryptChunk(largeChunk.buffer as ArrayBuffer, senderKey);
    const decrypted = await decryptChunk(encrypted, receiverKey);

    // Verify size and sample bytes
    expect(decrypted.byteLength).toBe(largeChunk.byteLength);
    expect(Array.from(new Uint8Array(decrypted).slice(0, 100))).toEqual(
      Array.from(largeChunk.slice(0, 100))
    );
  });
});
