/**
 * Tests for useTransferStats hook.
 * Fetches lifetime transfer stats (total bytes + count) for the dashboard.
 * Note: getUserTransferStats uses auth.uid() server-side — no userId is sent
 * over the wire. The userId param is only used as a "ready" signal (SEC-007).
 */
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetStats = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/transfer-service", () => ({
  getUserTransferStats: mockGetStats,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

import { useTransferStats } from "@/lib/hooks/use-transfer-stats";

describe("useTransferStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with isLoading=true and zero values", () => {
    mockGetStats.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useTransferStats("user-1"));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.totalBytes).toBe(0);
    expect(result.current.totalTransfers).toBe(0);
  });

  it("skips fetch and clears loading when userId is undefined", async () => {
    const { result } = renderHook(() => useTransferStats(undefined));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockGetStats).not.toHaveBeenCalled();
    expect(result.current.totalBytes).toBe(0);
    expect(result.current.totalTransfers).toBe(0);
  });

  it("populates stats on successful fetch", async () => {
    mockGetStats.mockResolvedValue({ totalBytesSent: 2048, totalTransfers: 7 });
    const { result } = renderHook(() => useTransferStats("user-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalBytes).toBe(2048);
    expect(result.current.totalTransfers).toBe(7);
    expect(mockGetStats).toHaveBeenCalledTimes(1);
  });

  it("handles null result without throwing", async () => {
    mockGetStats.mockResolvedValue(null);
    const { result } = renderHook(() => useTransferStats("user-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalBytes).toBe(0);
    expect(result.current.totalTransfers).toBe(0);
  });

  it("handles fetch error gracefully — clears loading, keeps zeros", async () => {
    mockGetStats.mockRejectedValue(new Error("RPC error"));
    const { result } = renderHook(() => useTransferStats("user-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalBytes).toBe(0);
    expect(result.current.totalTransfers).toBe(0);
  });

  it("re-fetches when userId changes", async () => {
    mockGetStats.mockResolvedValue({ totalBytesSent: 100, totalTransfers: 1 });
    const { rerender } = renderHook(
      ({ id }: { id?: string }) => useTransferStats(id),
      { initialProps: { id: "user-1" } }
    );

    await waitFor(() => expect(mockGetStats).toHaveBeenCalledTimes(1));

    rerender({ id: "user-2" });

    await waitFor(() => expect(mockGetStats).toHaveBeenCalledTimes(2));
  });
});
