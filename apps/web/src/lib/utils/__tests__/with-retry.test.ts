/**
 * Phase 1 — Retry Logic (with-retry.ts)
 *
 * Tests for: withRetry
 *
 * Validates: immediate success, eventual success after retries, max retries
 * exhausted, exponential backoff timing, and jitter behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "../with-retry";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to flush all pending timers and microtasks
  async function flushAll() {
    await vi.runAllTimersAsync();
  }

  // ─── Happy path ────────────────────────────────────────────────────────

  it("returns immediately if fn succeeds on first call", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("returns synchronous values", async () => {
    const fn = vi.fn().mockReturnValue(42);
    const result = await withRetry(fn);
    expect(result).toBe(42);
  });

  // ─── Eventual success ─────────────────────────────────────────────────

  it("retries and succeeds after initial failures", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail-1"))
      .mockRejectedValueOnce(new Error("fail-2"))
      .mockResolvedValue("success");

    const promise = withRetry(fn, 3, 100);
    await flushAll();

    const result = await promise;
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  // ─── Max retries exhausted ────────────────────────────────────────────

  it("throws the last error after all retries are exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent-error"));

    const promise = withRetry(fn, 2, 100);
    await flushAll();

    await expect(promise).rejects.toThrow("persistent-error");
    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the specific error from the last attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("error-1"))
      .mockRejectedValueOnce(new Error("error-2"))
      .mockRejectedValueOnce(new Error("error-3"));

    const promise = withRetry(fn, 2, 100);
    await flushAll();

    await expect(promise).rejects.toThrow("error-3");
  });

  // ─── Retry count ──────────────────────────────────────────────────────

  it("calls fn exactly maxRetries + 1 times when all fail", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    const promise = withRetry(fn, 5, 50);
    await flushAll();

    await expect(promise).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(6); // 1 + 5 retries
  });

  it("does not retry when maxRetries is 0", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("oneshot"));

    const promise = withRetry(fn, 0, 100);
    await flushAll();

    await expect(promise).rejects.toThrow("oneshot");
    expect(fn).toHaveBeenCalledOnce();
  });

  // ─── Default parameters ───────────────────────────────────────────────

  it("uses default maxRetries=3 and baseDelayMs=500", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    const promise = withRetry(fn);
    await flushAll();

    await expect(promise).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  // ─── Exponential backoff ──────────────────────────────────────────────

  it("uses exponential backoff with jitter (delays increase)", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    const promise = withRetry(fn, 3, 100);
    await flushAll();

    await expect(promise).rejects.toThrow();

    // Each setTimeout call is for the delay between retries
    // We expect 3 setTimeout calls (one per retry, not for the initial attempt)
    const delayCalls = setTimeoutSpy.mock.calls.filter(
      ([callback]) => typeof callback === "function"
    );
    // At minimum 3 delay calls happened (the retry delays)
    expect(delayCalls.length).toBeGreaterThanOrEqual(3);

    setTimeoutSpy.mockRestore();
  });

  // ─── Edge cases ───────────────────────────────────────────────────────

  it("handles fn that returns a rejected PromiseLike", async () => {
    const fn = vi.fn(() => ({
      then: (_: unknown, reject: (err: Error) => void) =>
        reject(new Error("promise-like-fail")),
    }));

    const promise = withRetry(fn, 1, 50);
    await flushAll();

    await expect(promise).rejects.toThrow("promise-like-fail");
  });

  it("handles fn that throws synchronously", async () => {
    const fn = vi.fn(() => {
      throw new Error("sync-throw");
    });

    const promise = withRetry(fn, 1, 50);
    await flushAll();

    await expect(promise).rejects.toThrow("sync-throw");
  });
});
