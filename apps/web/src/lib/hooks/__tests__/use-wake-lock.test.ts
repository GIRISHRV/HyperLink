import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWakeLock } from "../use-wake-lock";

// ── WakeLock mock ─────────────────────────────────────────────────────────────

type ReleaseListener = () => void;

let mockRelease: ReturnType<typeof vi.fn>;
let releaseListener: ReleaseListener | null;
let mockRequest: ReturnType<typeof vi.fn>;

function buildSentinel() {
  releaseListener = null;
  mockRelease = vi.fn().mockResolvedValue(undefined);
  return {
    release: mockRelease,
    addEventListener: vi.fn((event: string, cb: ReleaseListener) => {
      if (event === "release") releaseListener = cb;
    }),
  };
}

beforeEach(() => {
  releaseListener = null;
  const sentinel = buildSentinel();
  mockRequest = vi.fn().mockResolvedValue(sentinel);

  Object.defineProperty(navigator, "wakeLock", {
    value: { request: mockRequest },
    writable: true,
    configurable: true,
  });
});

describe("useWakeLock", () => {
  // ── request ───────────────────────────────────────────────────────────

  it("calls navigator.wakeLock.request('screen')", async () => {
    const { result } = renderHook(() => useWakeLock());
    await act(async () => { await result.current.request(); });
    expect(mockRequest).toHaveBeenCalledWith("screen");
  });

  it("sets isLocked to true after request", async () => {
    const { result } = renderHook(() => useWakeLock());
    await act(async () => { await result.current.request(); });
    expect(result.current.isLocked).toBe(true);
  });

  it("no-ops when navigator.wakeLock is absent", async () => {
    const originalWakeLock = navigator.wakeLock;
    delete (window.navigator as any).wakeLock;

    const { result } = renderHook(() => useWakeLock());
    await act(async () => { await result.current.request(); });
    expect(result.current.isLocked).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();

    // Restore it
    Object.defineProperty(navigator, "wakeLock", {
      value: originalWakeLock,
      writable: true,
      configurable: true,
    });
  });


  // ── sentinel release event ────────────────────────────────────────────

  it("sets isLocked to false when the sentinel fires its 'release' event", async () => {
    const { result } = renderHook(() => useWakeLock());
    await act(async () => { await result.current.request(); });
    expect(result.current.isLocked).toBe(true);

    act(() => { releaseListener?.(); });
    expect(result.current.isLocked).toBe(false);
  });

  // ── release ───────────────────────────────────────────────────────────

  it("calls sentinel.release() when release() is called", async () => {
    const { result } = renderHook(() => useWakeLock());
    await act(async () => { await result.current.request(); });
    await act(async () => { await result.current.release(); });
    expect(mockRelease).toHaveBeenCalled();
  });

  it("does not throw when release() called with no active lock", async () => {
    const { result } = renderHook(() => useWakeLock());
    await expect(act(async () => { await result.current.release(); })).resolves.not.toThrow();
  });

  // ── visibilitychange re-acquire ───────────────────────────────────────

  it("re-acquires lock on visibilitychange when isLocked=true but ref is null", async () => {
    const { result } = renderHook(() => useWakeLock());

    // 1. Acquire: isLocked=true, ref=sentinel
    await act(async () => { await result.current.request(); });
    expect(mockRequest).toHaveBeenCalledTimes(1);

    // 2. release() clears ref to null but does NOT change isLocked
    await act(async () => { await result.current.release(); });
    expect(result.current.isLocked).toBe(true); // isLocked unchanged by release()

    // 3. Visibility change → handler sees (isLocked=true, !ref) → re-requests
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it("does not re-acquire if isLocked is false on visibilitychange", async () => {
    renderHook(() => useWakeLock());
    // Never acquired → isLocked=false
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  // ── unmount cleanup ───────────────────────────────────────────────────

  it("calls release on unmount if an active lock exists", async () => {
    const { result, unmount } = renderHook(() => useWakeLock());
    await act(async () => { await result.current.request(); });
    await act(async () => { unmount(); });
    expect(mockRelease).toHaveBeenCalled();
  });
});
