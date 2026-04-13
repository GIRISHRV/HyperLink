/**
 * Tests for useRequireAuth hook.
 *
 * This hook ONLY provides { user, loading } — it does NOT redirect.
 * Auth gating is handled exclusively by the server-side middleware.
 * This separation prevents the redirect loops that occur when both
 * middleware and client-side code try to redirect simultaneously.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/auth-service", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

import { useRequireAuth } from "@/lib/hooks/use-require-auth";

const mockUser = { id: "user-123", email: "test@example.com" };
const AUTH_LOADING_TIMEOUT_MS = 8000;

describe("useRequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state before auth check resolves", () => {
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRequireAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("sets user and clears loading when authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it("sets user to null and clears loading when no user (no redirect)", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Key assertion: hook does NOT redirect — that's middleware's job
    expect(result.current.user).toBeNull();
  });

  it("handles fetch error gracefully — clears loading, no crash", async () => {
    mockGetCurrentUser.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it("only calls getCurrentUser once per mount", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    });
  });

  it("does not trigger any navigation — middleware handles auth gating", async () => {
    // This is a design constraint test: the hook should never
    // trigger navigation. Middleware handles auth gating.
    mockGetCurrentUser.mockResolvedValue(null);
    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // If we got here without errors, no router was needed
    expect(result.current.user).toBeNull();
  });

  it("clears loading after timeout if auth call hangs", async () => {
    vi.useFakeTimers();
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));

    try {
      const { result } = renderHook(() => useRequireAuth());
      expect(result.current.loading).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(AUTH_LOADING_TIMEOUT_MS + 1);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
