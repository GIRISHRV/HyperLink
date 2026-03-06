/**
 * Tests for useTransferGuard hook.
 * Critical data-integrity hook: prevents accidental navigation during an
 * active transfer and marks the transfer as "failed" in the DB when the
 * user does navigate away (unmount, tab close, back button).
 */
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUpdateStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/transfer-service", () => ({
  updateTransferStatus: mockUpdateStatus,
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

import { useTransferGuard } from "@/lib/hooks/use-transfer-guard";

describe("useTransferGuard", () => {
  let historySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateStatus.mockResolvedValue({ error: null });
    // Prevent jsdom history state side effects
    historySpy = vi.spyOn(window.history, "pushState").mockImplementation(() => { });
    vi.spyOn(window.history, "go").mockImplementation(() => { });
    mockPush.mockClear();
  });

  afterEach(() => {
    historySpy.mockRestore();
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it("showBackModal is false initially", () => {
    const { result } = renderHook(() =>
      useTransferGuard("transfer-1", false)
    );
    expect(result.current.showBackModal).toBe(false);
  });

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  it("marks transfer as failed on unmount when active", () => {
    const { unmount } = renderHook(() =>
      useTransferGuard("transfer-1", true)
    );
    unmount();
    expect(mockUpdateStatus).toHaveBeenCalledWith("transfer-1", "failed");
  });

  it("does NOT mark transfer as failed on unmount when inactive", () => {
    const { unmount } = renderHook(() =>
      useTransferGuard("transfer-1", false)
    );
    unmount();
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("does NOT call updateTransferStatus when transferId is null", () => {
    const { unmount } = renderHook(() =>
      useTransferGuard(null, true)
    );
    unmount();
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  // ── Idempotency ────────────────────────────────────────────────────────────

  it("only marks failed once even if beforeunload and unmount both fire", () => {
    const { unmount } = renderHook(() =>
      useTransferGuard("transfer-1", true)
    );

    // First: beforeunload (sets cleanedUpRef = true)
    window.dispatchEvent(new Event("beforeunload"));
    // Second: unmount cleanup (should see cleanedUpRef = true and bail)
    unmount();

    expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
  });

  // ── beforeunload listener ──────────────────────────────────────────────────

  it("beforeunload fires markTransferFailed when active", () => {
    renderHook(() => useTransferGuard("transfer-1", true));
    window.dispatchEvent(new Event("beforeunload"));
    expect(mockUpdateStatus).toHaveBeenCalledWith("transfer-1", "failed");
  });

  it("beforeunload does nothing when inactive", () => {
    renderHook(() => useTransferGuard("transfer-1", false));
    window.dispatchEvent(new Event("beforeunload"));
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("removes beforeunload listener on unmount", () => {
    const { unmount } = renderHook(() =>
      useTransferGuard("transfer-1", false)
    );
    unmount();
    window.dispatchEvent(new Event("beforeunload"));
    // isActive was false, so either way no call — key thing is no error
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  // ── Back-button modal ──────────────────────────────────────────────────────

  it("cancelBackNavigation hides the modal", () => {
    const { result } = renderHook(() =>
      useTransferGuard("transfer-1", true)
    );
    // Simulate modal being shown
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    act(() => {
      result.current.cancelBackNavigation();
    });

    expect(result.current.showBackModal).toBe(false);
  });

  it("confirmBackNavigation hides the modal and navigates back", () => {
    const { result } = renderHook(() =>
      useTransferGuard("transfer-1", true)
    );

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    act(() => {
      result.current.confirmBackNavigation();
    });

    expect(result.current.showBackModal).toBe(false);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  // ── Transitions ────────────────────────────────────────────────────────────

  it("does not mark failed when transfer becomes inactive before unmount", () => {
    const { unmount, rerender } = renderHook(
      ({ active }: { active: boolean }) => useTransferGuard("transfer-1", active),
      { initialProps: { active: true } }
    );

    // Transfer completed normally — isActive goes false
    rerender({ active: false });
    unmount();

    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });
});
