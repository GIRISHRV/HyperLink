/**
 * Phase 1 — Peer Message Validator (peer-message-validator.ts)
 *
 * Tests for: validatePeerMessage
 *
 * Security focus: Rejecting malformed/crafted payloads from malicious peers,
 * ensuring only valid message shapes pass through.
 */
import { describe, it, expect } from "vitest";
import { validatePeerMessage } from "../peer-message-validator";

// ─── Valid messages ────────────────────────────────────────────────────────

describe("validatePeerMessage — valid messages", () => {
  const VALID_TYPES = [
    "file-offer",
    "file-accept",
    "file-reject",
    "chunk",
    "chunk-ack",
    "transfer-complete",
    "transfer-error",
    "transfer-cancel",
    "transfer-pause",
    "transfer-resume",
    "receiver-busy",
    "chat-message",
  ] as const;

  for (const type of VALID_TYPES) {
    it(`accepts a valid "${type}" message`, () => {
      const msg = {
        type,
        transferId: "11111111-1111-4111-a111-111111111111",
        timestamp: Date.now(),
        payload: {},
      };
      expect(validatePeerMessage(msg)).toEqual(msg);
    });
  }

  it("rejects transferId of length 1 as invalid UUID", () => {
    const msg = { type: "chunk-ack", transferId: "x", timestamp: 1, payload: null };
    expect(validatePeerMessage(msg)).toBeNull();
  });

  it("rejects transferId of length 128 as invalid UUID", () => {
    const msg = { type: "chunk-ack", transferId: "a".repeat(128), timestamp: 1, payload: null };
    expect(validatePeerMessage(msg)).toBeNull();
  });

  it("accepts UUID-style transferIds", () => {
    const msg = {
      type: "file-offer",
      transferId: "550e8400-e29b-41d4-a716-446655440000",
      timestamp: Date.now(),
    };
    expect(validatePeerMessage(msg)).not.toBeNull();
  });

  it("allows extra fields (they pass through without stripping)", () => {
    const msg = {
      type: "file-accept",
      transferId: "11111111-1111-4111-a111-111111111111",
      timestamp: 1,
      payload: { extra: true },
      somethingElse: "test",
    };
    const result = validatePeerMessage(msg);
    expect(result).not.toBeNull();
  });
});

// ─── Rejection (invalid inputs) ────────────────────────────────────────────

describe("validatePeerMessage — rejected inputs", () => {
  it("rejects null", () => {
    expect(validatePeerMessage(null)).toBeNull();
  });

  it("rejects undefined", () => {
    expect(validatePeerMessage(undefined)).toBeNull();
  });

  it("rejects a number", () => {
    expect(validatePeerMessage(42)).toBeNull();
  });

  it("rejects a string", () => {
    expect(validatePeerMessage("hello")).toBeNull();
  });

  it("rejects a boolean", () => {
    expect(validatePeerMessage(true)).toBeNull();
  });

  it("rejects an array (typeof === 'object' but is Array)", () => {
    expect(validatePeerMessage([1, 2, 3])).toBeNull();
  });

  it("rejects empty object (missing fields)", () => {
    expect(validatePeerMessage({})).toBeNull();
  });

  it("rejects missing type", () => {
    expect(validatePeerMessage({ transferId: "id", timestamp: 1 })).toBeNull();
  });

  it("rejects non-string type", () => {
    expect(validatePeerMessage({ type: 123, transferId: "id", timestamp: 1 })).toBeNull();
  });

  it("rejects missing transferId", () => {
    expect(validatePeerMessage({ type: "chunk", timestamp: 1 })).toBeNull();
  });

  it("rejects non-string transferId", () => {
    expect(validatePeerMessage({ type: "chunk", transferId: 123, timestamp: 1 })).toBeNull();
  });

  it("rejects missing timestamp", () => {
    expect(validatePeerMessage({ type: "chunk", transferId: "id" })).toBeNull();
  });

  it("rejects non-number timestamp", () => {
    expect(validatePeerMessage({ type: "chunk", transferId: "id", timestamp: "now" })).toBeNull();
  });

  it("rejects unknown message type", () => {
    expect(
      validatePeerMessage({ type: "unknown-type", transferId: "id", timestamp: 1 })
    ).toBeNull();
  });

  it("rejects empty transferId", () => {
    expect(validatePeerMessage({ type: "chunk", transferId: "", timestamp: 1 })).toBeNull();
  });

  it("rejects transferId longer than 128 characters", () => {
    expect(
      validatePeerMessage({ type: "chunk", transferId: "x".repeat(129), timestamp: 1 })
    ).toBeNull();
  });

  // ─── Injection / adversarial payloads ──────────────────────────────────

  it("rejects prototype pollution attempt (__proto__)", () => {
    const msg = {
      __proto__: { admin: true },
      type: "invalid",
      transferId: "id",
      timestamp: 1,
    };
    expect(validatePeerMessage(msg)).toBeNull();
  });

  it("rejects script injection in type field", () => {
    expect(
      validatePeerMessage({
        type: '<script>alert("xss")</script>',
        transferId: "id",
        timestamp: 1,
      })
    ).toBeNull();
  });

  it("rejects extremely large object (DoS payload size doesn't crash)", () => {
    const bigPayload = {
      type: "chunk",
      transferId: "11111111-1111-4111-a111-111111111111",
      timestamp: 1,
      data: "x".repeat(10_000_000),
    };
    // Should still validate the shape (it'll pass because shape is valid)
    expect(validatePeerMessage(bigPayload)).not.toBeNull();
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────

describe("validatePeerMessage — edge cases", () => {
  it("handles timestamp of 0", () => {
    const msg = { type: "chunk", transferId: "11111111-1111-4111-a111-111111111111", timestamp: 0 };
    // 0 is a valid number
    expect(validatePeerMessage(msg)).not.toBeNull();
  });

  it("handles negative timestamp", () => {
    const msg = {
      type: "chunk",
      transferId: "11111111-1111-4111-a111-111111111111",
      timestamp: -1,
    };
    // -1 is a valid number (validator doesn't range-check)
    expect(validatePeerMessage(msg)).not.toBeNull();
  });

  it("handles NaN timestamp", () => {
    // NaN is typeof 'number' but semantically invalid
    // The current validator accepts it — this test documents that behavior.
    const msg = {
      type: "chunk",
      transferId: "11111111-1111-4111-a111-111111111111",
      timestamp: NaN,
    };
    expect(validatePeerMessage(msg)).not.toBeNull();
  });
});
