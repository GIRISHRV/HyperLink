/**
 * Phase 1 — Cryptography (apps/web/src/lib/utils/crypto.ts)
 *
 * Tests for: generateSalt, generateIV, deriveKey, encryptChunk,
 * decryptChunk, arrayBufferToBase64, base64ToArrayBuffer
 *
 * Security focus: PBKDF2 strength, AES-GCM authentication, IV management,
 * round-trip integrity, tamper/wrong-key detection.
 *
 * NOTE: jsdom exposes a subset of Web Crypto. We use the real API where
 * available, falling back to Node's built-in `crypto.subtle` via globalThis.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  generateSalt,
  generateIV,
  deriveKey,
  encryptChunk,
  decryptChunk,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../crypto";

// Always override with Node's native webcrypto — jsdom ships a partial
// @peculiar/webcrypto implementation that rejects plain `new Uint8Array()` buffers
// in some operations. Node's native crypto.webcrypto is fully spec-compliant.
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require("node:crypto");
  const wc = nodeCrypto.webcrypto;
  Object.defineProperty(globalThis, "crypto", { value: wc, configurable: true, writable: true });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "crypto", { value: wc, configurable: true, writable: true });
  }
});

// ─── Helper ────────────────────────────────────────────────────────────────

function toUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// ─── generateSalt ──────────────────────────────────────────────────────────

describe("generateSalt", () => {
  it("returns a Uint8Array of 16 bytes", () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.byteLength).toBe(16);
  });

  it("generates unique salts (no repeats in 100 calls)", () => {
    const salts = new Set(
      Array.from({ length: 100 }, () => arrayBufferToBase64(generateSalt()))
    );
    expect(salts.size).toBe(100);
  });
});

// ─── generateIV ────────────────────────────────────────────────────────────

describe("generateIV", () => {
  it("returns a Uint8Array of 12 bytes (AES-GCM standard)", () => {
    const iv = generateIV();
    expect(iv).toBeInstanceOf(Uint8Array);
    expect(iv.byteLength).toBe(12);
  });

  it("generates unique IVs", () => {
    const ivs = new Set(
      Array.from({ length: 100 }, () => arrayBufferToBase64(generateIV()))
    );
    expect(ivs.size).toBe(100);
  });
});

// ─── deriveKey ─────────────────────────────────────────────────────────────

describe("deriveKey", () => {
  it("returns a CryptoKey", async () => {
    const key = await deriveKey("password123", generateSalt());
    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
  });

  it("derives the same key for the same password + salt (deterministic)", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("mypassword", salt);
    const key2 = await deriveKey("mypassword", salt);

    // CryptoKey objects won't be the same reference but encrypting
    // the same data with both should yield the same plaintext after decryption.
    const plain = toUint8("test data").buffer as ArrayBuffer;
    const enc1 = await encryptChunk(plain, key1);
    // Decrypt enc1 with key2 should succeed
    const dec = await decryptChunk(enc1, key2);
    expect(Array.from(new Uint8Array(dec))).toEqual(Array.from(toUint8("test data")));
  });

  it("derives different keys for different passwords", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("password-A", salt);
    const key2 = await deriveKey("password-B", salt);

    const plain = toUint8("secret").buffer as ArrayBuffer;
    const cipher = await encryptChunk(plain, key1);

    // Decrypting with the wrong key should throw (AES-GCM authentication)
    await expect(decryptChunk(cipher, key2)).rejects.toThrow();
  });

  it("derives different keys for the same password with different salts", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const key1 = await deriveKey("same-password", salt1);
    const key2 = await deriveKey("same-password", salt2);

    const plain = toUint8("data").buffer as ArrayBuffer;
    const cipher = await encryptChunk(plain, key1);
    await expect(decryptChunk(cipher, key2)).rejects.toThrow();
  });

  it("handles empty password", async () => {
    const key = await deriveKey("", generateSalt());
    expect(key).toBeDefined();
  });

  it("handles very long passwords (1000 chars)", async () => {
    const long = "x".repeat(1000);
    const key = await deriveKey(long, generateSalt());
    expect(key).toBeDefined();
  });

  it("handles unicode passwords", async () => {
    const key = await deriveKey("пароль密码🔑", generateSalt());
    expect(key).toBeDefined();
  });
});

// ─── encryptChunk / decryptChunk ───────────────────────────────────────────

describe("encryptChunk + decryptChunk (round-trip)", () => {
  let key: CryptoKey;

  beforeAll(async () => {
    key = await deriveKey("test-password", generateSalt());
  });

  it("round-trips ASCII data correctly", async () => {
    const plain = toUint8("Hello, World!").buffer as ArrayBuffer;
    const encrypted = await encryptChunk(plain, key);
    const decrypted = await decryptChunk(encrypted, key);
    expect(Array.from(new Uint8Array(decrypted))).toEqual(Array.from(toUint8("Hello, World!")));
  });

  it("round-trips empty data", async () => {
    const plain = new Uint8Array(0).buffer as ArrayBuffer;
    const encrypted = await encryptChunk(plain, key);
    const decrypted = await decryptChunk(encrypted, key);
    expect(decrypted.byteLength).toBe(0);
  });

  it("round-trips binary data (random 64KB chunk)", async () => {
    const plain = crypto.getRandomValues(new Uint8Array(65536)).buffer as ArrayBuffer;
    const encrypted = await encryptChunk(plain, key);
    const decrypted = await decryptChunk(encrypted, key);
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(plain));
  });

  it("encrypted output is larger than plaintext (IV + auth tag overhead)", async () => {
    const plain = toUint8("payload").buffer as ArrayBuffer;
    const encrypted = await encryptChunk(plain, key);
    // IV = 12 bytes, auth tag = 16 bytes → overhead = 28 bytes
    expect(encrypted.byteLength).toBe(plain.byteLength + 12 + 16);
  });

  it("different encryptions of same data produce different ciphertexts (random IV)", async () => {
    const plain = toUint8("same data").buffer as ArrayBuffer;
    const enc1 = await encryptChunk(plain, key);
    const enc2 = await encryptChunk(plain, key);
    // The full buffers should differ because IVs differ
    expect(new Uint8Array(enc1)).not.toEqual(new Uint8Array(enc2));
  });

  it("detects tampered ciphertext (AES-GCM authentication)", async () => {
    const plain = toUint8("test").buffer as ArrayBuffer;
    const encrypted = await encryptChunk(plain, key);
    const tampered = new Uint8Array(encrypted);
    // Flip the last byte (inside the auth tag region)
    tampered[tampered.length - 1] ^= 0xff;
    await expect(decryptChunk(tampered.buffer, key)).rejects.toThrow();
  });

  it("rejects decryption with the wrong key", async () => {
    const wrongKey = await deriveKey("wrong-pwd", generateSalt());
    const plain = toUint8("secret").buffer as ArrayBuffer;
    const encrypted = await encryptChunk(plain, key);
    await expect(decryptChunk(encrypted, wrongKey)).rejects.toThrow();
  });

  it("handles 1-byte data", async () => {
    const plain = new Uint8Array([42]).buffer as ArrayBuffer;
    const encrypted = await encryptChunk(plain, key);
    const decrypted = await decryptChunk(encrypted, key);
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array([42]));
  });

  it("handles large payload (1 MB)", async () => {
    // crypto.getRandomValues() has a 65536-byte limit per call
    const plain = new Uint8Array(1024 * 1024);
    for (let i = 0; i < plain.length; i += 65536) {
      crypto.getRandomValues(plain.subarray(i, i + 65536));
    }
    const encrypted = await encryptChunk(plain.buffer as ArrayBuffer, key);
    const decrypted = await decryptChunk(encrypted, key);
    expect(new Uint8Array(decrypted).length).toBe(plain.length);
    expect(Array.from(new Uint8Array(decrypted).slice(0, 16))).toEqual(Array.from(plain.slice(0, 16)));
  });
});

// ─── arrayBufferToBase64 / base64ToArrayBuffer ─────────────────────────────

describe("arrayBufferToBase64 + base64ToArrayBuffer (encoding round-trip)", () => {
  it("round-trips a known byte sequence", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    const b64 = arrayBufferToBase64(bytes);
    const restored = base64ToArrayBuffer(b64);
    expect(restored).toEqual(bytes);
  });

  it("round-trips empty array", () => {
    const empty = new Uint8Array(0);
    const b64 = arrayBufferToBase64(empty);
    expect(b64).toBe("");
    const restored = base64ToArrayBuffer(b64);
    expect(restored.byteLength).toBe(0);
  });

  it("round-trips a 16-byte salt", () => {
    const salt = generateSalt();
    const b64 = arrayBufferToBase64(salt);
    const restored = base64ToArrayBuffer(b64);
    expect(restored).toEqual(salt);
  });

  it("produces valid Base64 characters only", () => {
    const data = crypto.getRandomValues(new Uint8Array(256));
    const b64 = arrayBufferToBase64(data);
    expect(b64).toMatch(/^[A-Za-z0-9+/=]*$/);
  });
});
