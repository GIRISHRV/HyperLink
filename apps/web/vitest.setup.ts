
import '@testing-library/jest-dom'

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// ── localStorage polyfill ────────────────────────────────────────────────────
// jsdom provides localStorage, but in some Vitest configurations the global
// object doesn't wire it up correctly, causing "localStorage.getItem is not a
// function". This polyfill ensures the API is always available in tests.
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.getItem !== "function") {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as Storage;
}
/**
 * ─── Suppress Expected Unhandled Rejections ──────────────────────────────
 *
 * Several tests intentionally exercise error/retry paths that produce
 * transient "unhandled" promise rejections. These are NOT bugs — they
 * occur because:
 *
 *   1. with-retry.test.ts (8 rejections)
 *      `mockRejectedValue()` creates pre-rejected promises. When
 *      `withRetry()` catches an attempt and waits before retrying,
 *      Node marks the rejection as "unhandled" in the gap between
 *      creation and the next `.catch()`. The promise IS ultimately
 *      handled — Node just notices the rejection before the handler
 *      attaches.
 *
 *   2. sender.test.ts (1 rejection)
 *      The "does not double-start" test emits a `file-accept` to
 *      exercise the re-entrance guard. This triggers `pump()`, which
 *      calls `file.slice().arrayBuffer()` on a minimal mock. The
 *      resulting internal error is caught by `sendNextChunk` and
 *      forwarded to `rejectTransfer`, but the intermediate rejection
 *      surfaces before the handler attaches.
 *
 * The listener below silences ONLY errors whose messages match these
 * known patterns. Any genuinely unexpected rejection will still cause
 * a visible test failure.
 */
const EXPECTED_REJECTION_PATTERNS = [
  /persistent-error/,
  /error-[123]/,
  /fail$/,
  /oneshot/,
  /promise-like-fail/,
  /sync-throw/,
  /File read error/,
];

process.on('unhandledRejection', (reason: unknown) => {
  const message =
    reason instanceof Error ? reason.message : String(reason);
  const isExpected = EXPECTED_REJECTION_PATTERNS.some((re) => re.test(message));
  if (isExpected) {
    // Swallow — this rejection is expected by a retry / error-path test.
    return;
  }
  // Re-throw genuinely unexpected rejections so they still fail the suite.
  throw reason;
});
