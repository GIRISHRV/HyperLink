/**
 * Phase 1 — Utilities (packages/utils/src/index.ts)
 *
 * Tests for: formatFileSize, generateTransferId, calculateChunkCount,
 * calculateSpeed, calculateTimeRemaining, formatTime, validateFileSize,
 * debounce, throttle
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatFileSize,
  generateTransferId,
  calculateChunkCount,
  calculateSpeed,
  calculateTimeRemaining,
  formatTime,
  validateFileSize,
  debounce,
  throttle,
} from "@repo/utils";

// ─── formatFileSize ────────────────────────────────────────────────────────

describe("formatFileSize", () => {
  it("returns '0 Bytes' for 0", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
  });

  it("returns '0 Bytes' for negative values", () => {
    expect(formatFileSize(-100)).toBe("0 Bytes");
  });

  it("returns '0 Bytes' for NaN", () => {
    expect(formatFileSize(NaN)).toBe("0 Bytes");
  });

  it("formats bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 Bytes");
    expect(formatFileSize(1)).toBe("1 Bytes");
  });

  it("formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
    expect(formatFileSize(1572864)).toBe("1.5 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
  });

  it("formats terabytes correctly", () => {
    expect(formatFileSize(1099511627776)).toBe("1 TB");
  });

  it("handles fractional byte values", () => {
    // 2.5 KB = 2560
    expect(formatFileSize(2560)).toBe("2.5 KB");
  });

  it("handles exact boundary (1 KB)", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("handles just below a boundary", () => {
    // 1023 bytes is still Bytes
    expect(formatFileSize(1023)).toBe("1023 Bytes");
  });
});

// ─── generateTransferId ────────────────────────────────────────────────────

describe("generateTransferId", () => {
  it("returns a non-empty string", () => {
    const id = generateTransferId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("returns unique IDs on repeated calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTransferId()));
    expect(ids.size).toBe(100);
  });

  it("returns a UUID when crypto.randomUUID is available", () => {
    const id = generateTransferId();
    // UUID v4 regex
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

// ─── calculateChunkCount ───────────────────────────────────────────────────

describe("calculateChunkCount", () => {
  const CHUNK_SIZE = 65536; // 64KB default

  it("returns 1 for file smaller than chunk size", () => {
    expect(calculateChunkCount(100)).toBe(1);
  });

  it("returns 1 for file exactly chunk size", () => {
    expect(calculateChunkCount(CHUNK_SIZE)).toBe(1);
  });

  it("returns 2 for file chunk-size + 1", () => {
    expect(calculateChunkCount(CHUNK_SIZE + 1)).toBe(2);
  });

  it("handles large files", () => {
    const GB = 1024 * 1024 * 1024;
    expect(calculateChunkCount(GB)).toBe(Math.ceil(GB / CHUNK_SIZE));
  });

  it("respects custom chunk size", () => {
    expect(calculateChunkCount(100, 10)).toBe(10);
  });

  it("returns 0 for 0-byte file", () => {
    expect(calculateChunkCount(0)).toBe(0);
  });
});

// ─── calculateSpeed ────────────────────────────────────────────────────────

describe("calculateSpeed", () => {
  it("returns 0 when elapsed time is 0 (division by zero guard)", () => {
    expect(calculateSpeed(1000, 0)).toBe(0);
  });

  it("calculates bytes per second correctly", () => {
    // 1000 bytes in 2000ms = 500 B/s
    expect(calculateSpeed(1000, 2000)).toBe(500);
  });

  it("handles large transfers", () => {
    const MB = 1024 * 1024;
    expect(calculateSpeed(10 * MB, 10000)).toBe(1 * MB);
  });
});

// ─── calculateTimeRemaining ────────────────────────────────────────────────

describe("calculateTimeRemaining", () => {
  it("returns Infinity when speed is 0", () => {
    expect(calculateTimeRemaining(1000, 0, 0)).toBe(Infinity);
  });

  it("calculates time remaining correctly", () => {
    // 500 bytes remaining at 100 B/s = 5s
    expect(calculateTimeRemaining(1000, 500, 100)).toBe(5);
  });

  it("returns 0 when transfer is complete", () => {
    expect(calculateTimeRemaining(1000, 1000, 100)).toBe(0);
  });
});

// ─── formatTime ────────────────────────────────────────────────────────────

describe("formatTime", () => {
  it("returns 'Calculating...' for Infinity", () => {
    expect(formatTime(Infinity)).toBe("Calculating...");
  });

  it("returns 'Calculating...' for -Infinity", () => {
    expect(formatTime(-Infinity)).toBe("Calculating...");
  });

  it("returns 'Calculating...' for NaN", () => {
    expect(formatTime(NaN)).toBe("Calculating...");
  });

  it("formats seconds under a minute", () => {
    expect(formatTime(45)).toBe("45s");
  });

  it("rounds fractional seconds", () => {
    expect(formatTime(45.7)).toBe("46s");
  });

  it("formats 0 seconds", () => {
    expect(formatTime(0)).toBe("0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(90)).toBe("1m 30s");
  });

  it("formats hours and minutes", () => {
    expect(formatTime(3661)).toBe("1h 1m");
  });
});

// ─── validateFileSize ──────────────────────────────────────────────────────

describe("validateFileSize", () => {
  it("rejects 0-byte files", () => {
    const result = validateFileSize(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("File is empty");
  });

  it("accepts a 1-byte file", () => {
    expect(validateFileSize(1).valid).toBe(true);
  });

  it("accepts a file at exactly 50 GB", () => {
    const MAX = 50 * 1024 * 1024 * 1024;
    expect(validateFileSize(MAX).valid).toBe(true);
  });

  it("rejects a file larger than 50 GB", () => {
    const OVER = 50 * 1024 * 1024 * 1024 + 1;
    const result = validateFileSize(OVER);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceeds maximum/);
  });

  it("accepts typical file sizes", () => {
    expect(validateFileSize(1024 * 1024)).toEqual({ valid: true }); // 1 MB
    expect(validateFileSize(1024 * 1024 * 1024)).toEqual({ valid: true }); // 1 GB
  });
});

// ─── debounce ──────────────────────────────────────────────────────────────

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("delays execution until wait period has elapsed", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("resets the timer on subsequent calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    vi.advanceTimersByTime(100);
    debounced(); // reset
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("passes arguments to the original function", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("a", "b");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("a", "b");
  });
});

// ─── throttle ──────────────────────────────────────────────────────────────

describe("throttle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("immediately invokes the function on first call", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("suppresses subsequent calls within the limit period", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled(); // fires
    throttled(); // suppressed
    throttled(); // suppressed
    expect(fn).toHaveBeenCalledOnce();
  });

  it("allows calls again after the limit period expires", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();
    vi.advanceTimersByTime(200);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("passes arguments to the original function", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("x");
    expect(fn).toHaveBeenCalledWith("x");
  });
});
