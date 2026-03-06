/**
 * Phase 1 — Transfer State FSM (use-transfer-state.ts)
 *
 * Tests for: useTransferState hook (reducer, derived booleans, progress)
 *
 * Validates: initial state, all valid transitions, invalid transition guards,
 * progress computation, convenience flags.
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransferState } from "../use-transfer-state";

describe("useTransferState", () => {
  // ─── Initial state ────────────────────────────────────────────────────

  it("starts in idle state", () => {
    const { result } = renderHook(() => useTransferState());
    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.bytesTransferred).toBe(0);
    expect(result.current.state.totalBytes).toBe(0);
  });

  it("has correct initial convenience flags", () => {
    const { result } = renderHook(() => useTransferState());
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isTransferring).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.isFailed).toBe(false);
    expect(result.current.isCancelled).toBe(false);
    expect(result.current.isActive).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  // ─── Happy path: full lifecycle ───────────────────────────────────────

  it("transitions through full happy-path lifecycle", () => {
    const { result } = renderHook(() => useTransferState());

    // idle → connecting
    act(() => result.current.dispatch({ type: "CONNECT" }));
    expect(result.current.state.status).toBe("connecting");
    expect(result.current.isConnecting).toBe(true);

    // connecting → offering
    act(() => result.current.dispatch({ type: "OFFER" }));
    expect(result.current.state.status).toBe("offering");
    expect(result.current.isConnecting).toBe(true); // offering is a connecting sub-state

    // offering → awaiting_acceptance
    act(() => result.current.dispatch({ type: "AWAIT_ACCEPTANCE" }));
    expect(result.current.state.status).toBe("awaiting_acceptance");
    expect(result.current.isConnecting).toBe(true);

    // awaiting_acceptance → transferring
    act(() => result.current.dispatch({ type: "START_TRANSFER", totalBytes: 1000 }));
    expect(result.current.state.status).toBe("transferring");
    expect(result.current.state.totalBytes).toBe(1000);
    expect(result.current.state.bytesTransferred).toBe(0);
    expect(result.current.isTransferring).toBe(true);
    expect(result.current.isActive).toBe(true);

    // progress update
    act(() =>
      result.current.dispatch({
        type: "PROGRESS",
        bytesTransferred: 500,
        speed: 100,
        remaining: 5,
      })
    );
    expect(result.current.state.bytesTransferred).toBe(500);
    expect(result.current.state.speedBytesPerSecond).toBe(100);
    expect(result.current.state.estimatedSecondsRemaining).toBe(5);
    expect(result.current.progress).toBe(50);

    // transferring → complete
    act(() => result.current.dispatch({ type: "COMPLETE" }));
    expect(result.current.state.status).toBe("complete");
    expect(result.current.isComplete).toBe(true);
    expect(result.current.state.bytesTransferred).toBe(1000); // COMPLETE sets bytesTransferred = totalBytes
    expect(result.current.progress).toBe(100);
  });

  // ─── Pause / Resume ──────────────────────────────────────────────────

  it("supports pause and resume during transfer", () => {
    const { result } = renderHook(() => useTransferState());

    act(() => result.current.dispatch({ type: "START_TRANSFER", totalBytes: 1000 }));
    expect(result.current.isTransferring).toBe(true);

    // pause
    act(() => result.current.dispatch({ type: "PAUSE", pausedBy: "local" }));
    expect(result.current.state.status).toBe("paused");
    expect(result.current.isPaused).toBe(true);
    expect(result.current.isActive).toBe(true); // paused is still considered "active"

    // resume
    act(() => result.current.dispatch({ type: "RESUME" }));
    expect(result.current.state.status).toBe("transferring");
    expect(result.current.isTransferring).toBe(true);
  });

  // ─── Failure ──────────────────────────────────────────────────────────

  it("transitions to failed with error message", () => {
    const { result } = renderHook(() => useTransferState());

    act(() => result.current.dispatch({ type: "CONNECT" }));
    act(() => result.current.dispatch({ type: "FAIL", error: "Connection lost" }));

    expect(result.current.state.status).toBe("failed");
    expect(result.current.state.error).toBe("Connection lost");
    expect(result.current.isFailed).toBe(true);
  });

  // ─── Cancellation ────────────────────────────────────────────────────

  it("transitions to cancelled", () => {
    const { result } = renderHook(() => useTransferState());

    act(() => result.current.dispatch({ type: "START_TRANSFER", totalBytes: 500 }));
    act(() => result.current.dispatch({ type: "CANCEL" }));

    expect(result.current.state.status).toBe("cancelled");
    expect(result.current.isCancelled).toBe(true);
  });

  // ─── Reset ────────────────────────────────────────────────────────────

  it("resets to initial idle state", () => {
    const { result } = renderHook(() => useTransferState());

    act(() => result.current.dispatch({ type: "START_TRANSFER", totalBytes: 1000 }));
    act(() =>
      result.current.dispatch({ type: "PROGRESS", bytesTransferred: 500 })
    );
    act(() => result.current.dispatch({ type: "COMPLETE" }));

    // Now reset
    act(() => result.current.dispatch({ type: "RESET" }));
    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.bytesTransferred).toBe(0);
    expect(result.current.state.totalBytes).toBe(0);
    expect(result.current.isIdle).toBe(true);
    expect(result.current.progress).toBe(0);
  });

  // ─── Invalid transitions (guards) ────────────────────────────────────

  describe("invalid transitions are no-ops", () => {
    it("PAUSE when not transferring is a no-op", () => {
      const { result } = renderHook(() => useTransferState());
      act(() => result.current.dispatch({ type: "PAUSE", pausedBy: "local" }));
      expect(result.current.state.status).toBe("idle"); // unchanged
    });

    it("PAUSE when idle does nothing", () => {
      const { result } = renderHook(() => useTransferState());
      act(() => result.current.dispatch({ type: "PAUSE", pausedBy: "local" }));
      expect(result.current.state.status).toBe("idle");
    });

    it("RESUME when not paused is a no-op", () => {
      const { result } = renderHook(() => useTransferState());

      act(() => result.current.dispatch({ type: "START_TRANSFER", totalBytes: 100 }));
      // Status is "transferring", RESUME should be no-op
      act(() => result.current.dispatch({ type: "RESUME" }));
      expect(result.current.state.status).toBe("transferring");
    });

    it("PROGRESS when idle is a no-op", () => {
      const { result } = renderHook(() => useTransferState());
      act(() =>
        result.current.dispatch({ type: "PROGRESS", bytesTransferred: 100 })
      );
      expect(result.current.state.bytesTransferred).toBe(0);
    });

    it("PROGRESS when complete is a no-op", () => {
      const { result } = renderHook(() => useTransferState());
      act(() => result.current.dispatch({ type: "START_TRANSFER", totalBytes: 100 }));
      act(() => result.current.dispatch({ type: "COMPLETE" }));
      act(() =>
        result.current.dispatch({ type: "PROGRESS", bytesTransferred: 999 })
      );
      expect(result.current.state.bytesTransferred).toBe(100); // set by COMPLETE
    });
  });

  // ─── Progress calculation ─────────────────────────────────────────────

  describe("progress calculation", () => {
    it("returns 0 when totalBytes is 0 (no division by zero)", () => {
      const { result } = renderHook(() => useTransferState());
      expect(result.current.progress).toBe(0);
    });

    it("clamps between 0 and 100", () => {
      const { result } = renderHook(() => useTransferState());

      act(() => result.current.dispatch({ type: "START_TRANSFER", totalBytes: 100 }));

      // Normal progress
      act(() =>
        result.current.dispatch({ type: "PROGRESS", bytesTransferred: 50 })
      );
      expect(result.current.progress).toBe(50);

      // Over 100% (shouldn't happen but clamp protects)
      act(() =>
        result.current.dispatch({ type: "PROGRESS", bytesTransferred: 200 })
      );
      expect(result.current.progress).toBe(100);
    });

    it("handles progress updates while paused", () => {
      const { result } = renderHook(() => useTransferState());
      act(() => result.current.dispatch({ type: "START_TRANSFER", totalBytes: 1000 }));
      act(() => result.current.dispatch({ type: "PAUSE", pausedBy: "local" }));

      // Progress updates should still be accepted when paused
      act(() =>
        result.current.dispatch({ type: "PROGRESS", bytesTransferred: 500 })
      );
      expect(result.current.state.bytesTransferred).toBe(500);
    });
  });

  // ─── CONNECT clears previous error ───────────────────────────────────

  it("clears error on CONNECT", () => {
    const { result } = renderHook(() => useTransferState());

    act(() => result.current.dispatch({ type: "FAIL", error: "oops" }));
    expect(result.current.state.error).toBe("oops");

    act(() => result.current.dispatch({ type: "CONNECT" }));
    expect(result.current.state.error).toBeUndefined();
  });
});
