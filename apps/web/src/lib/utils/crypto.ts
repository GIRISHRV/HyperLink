/**
 * Cryptographic utilities for End-to-End Password Protection.
 * Uses Web Crypto API for performance and security.
 */

// Configuration constants
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12;   // bytes (standard for AES-GCM)
const KEY_LENGTH = 256; // bits (AES-256)

/**
 * Generate a random salt for key derivation.
 */
export function generateSalt(): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random 12-byte IV for AES-GCM.
 */
export function generateIV(): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive an AES-GCM key from a password and salt using PBKDF2.
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as unknown as BufferSource,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: KEY_LENGTH },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypt a chunk of data.
 * Prepends the 12-byte IV to the ciphertext.
 * Output format: [IV (12 bytes) | Ciphertext (N bytes) | Tag (16 bytes, included in ciphertext by WebCrypto)]
 */
export async function encryptChunk(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = generateIV();
    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv as unknown as BufferSource,
        },
        key,
        data
    );

    // Combine IV and Ciphertext
    const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(ciphertext), iv.byteLength);

    return result.buffer;
}

/**
 * Decrypt a chunk of data.
 * Expects input format: [IV (12 bytes) | Ciphertext...]
 */
export async function decryptChunk(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = data.slice(0, IV_LENGTH);
    const ciphertext = data.slice(IV_LENGTH);

    return window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: new Uint8Array(iv) as unknown as BufferSource,
        },
        key,
        ciphertext
    );
}

/**
 * Helper to convert Uint8Array to Base64 (for sending salt in JSON)
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Helper to convert Base64 to Uint8Array (for receiving salt)
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}
