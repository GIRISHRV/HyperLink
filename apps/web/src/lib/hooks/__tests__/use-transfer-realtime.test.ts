// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUserTransfersRealtime } from "@/lib/hooks/use-transfer-realtime";

// ──────────────────────────────────────────────────────────────
// Supabase mock (vi.hoisted so factory can reference these vars)
// ──────────────────────────────────────────────────────────────
const {
  channelHandlers,
  channelMock,
  queryMock,
  supabaseMock,
  deleteTransferMock,
  deleteMultipleMock,
} = vi.hoisted(() => {
  const channelHandlers: Record<string, (payload: unknown) => void> = {};

  const channelMock = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channelMock.on.mockImplementation(
    (_type: string, filter: { event: string }, handler: (p: unknown) => void) => {
      channelHandlers[filter.event] = handler;
      return channelMock;
    }
  );
  channelMock.subscribe.mockReturnValue(channelMock);

  const queryMock = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  };
  queryMock.select.mockReturnValue(queryMock);
  queryMock.eq.mockReturnValue(queryMock);
  queryMock.single.mockResolvedValue({ data: null });
  queryMock.or.mockReturnValue(queryMock);
  queryMock.order.mockReturnValue(queryMock);
  queryMock.range.mockResolvedValue({ data: [] });

  const supabaseMock = {
    from: vi.fn().mockReturnValue(queryMock),
    channel: vi.fn().mockReturnValue(channelMock),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
  };

  const deleteTransferMock = vi.fn().mockResolvedValue(undefined);
  const deleteMultipleMock = vi.fn().mockResolvedValue({ count: 0 });

  return {
    channelHandlers,
    channelMock,
    queryMock,
    supabaseMock,
    deleteTransferMock,
    deleteMultipleMock,
  };
});

vi.mock("@/lib/supabase/client", () => ({ supabase: supabaseMock }));

vi.mock("@/lib/services/transfer-service", () => ({
  deleteTransfer: (...args: unknown[]) => deleteTransferMock(...args),
  deleteMultipleTransfers: (...args: unknown[]) => deleteMultipleMock(...args),
}));

// ──────────────────────────────────────────────────────────────
// Test data
// ──────────────────────────────────────────────────────────────

const TRANSFER_A = {
  id: "transfer-a",
  status: "complete" as const,
  created_at: "2024-01-01T00:00:00Z",
  sender_id: "user-1",
  receiver_id: "user-2",
};

const TRANSFER_B = {
  id: "transfer-b",
  status: "failed" as const,
  created_at: "2024-01-02T00:00:00Z",
  sender_id: "user-1",
  receiver_id: "user-2",
};

// ──────────────────────────────────────────────────────────────
// Reset helpers
// ──────────────────────────────────────────────────────────────

function rewireChannelMock() {
  channelMock.on.mockImplementation(
    (_type: string, filter: { event: string }, handler: (p: unknown) => void) => {
      channelHandlers[filter.event] = handler;
      return channelMock;
    }
  );
  channelMock.subscribe.mockReturnValue(channelMock);
}

function rewireQueryMock() {
  queryMock.select.mockReturnValue(queryMock);
  queryMock.eq.mockReturnValue(queryMock);
  queryMock.single.mockResolvedValue({ data: null });
  queryMock.or.mockReturnValue(queryMock);
  queryMock.order.mockReturnValue(queryMock);
  queryMock.range.mockResolvedValue({ data: [] });
  supabaseMock.from.mockReturnValue(queryMock);
  supabaseMock.channel.mockReturnValue(channelMock);
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(channelHandlers)) delete channelHandlers[k];
  rewireChannelMock();
  rewireQueryMock();
  deleteTransferMock.mockResolvedValue(undefined);
  deleteMultipleMock.mockResolvedValue({ count: 0 });
});

// ──────────────────────────────────────────────────────────────
// useUserTransfersRealtime
// ──────────────────────────────────────────────────────────────

describe("useUserTransfersRealtime", () => {
  it("returns loading=false with empty list when no user", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const { result } = renderHook(() => useUserTransfersRealtime());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transfers).toHaveLength(0);
  });

  it("fetches and returns only final-status transfers", async () => {
    queryMock.range.mockResolvedValueOnce({
      data: [
        { ...TRANSFER_A, status: "complete" },
        { ...TRANSFER_B, status: "failed" },
        {
          id: "in-progress-id",
          status: "transferring",
          created_at: "2024-01-03T00:00:00Z",
        },
      ],
    });

    const { result } = renderHook(() => useUserTransfersRealtime());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ids = result.current.transfers.map((t) => t.id);
    expect(ids).toContain("transfer-a");
    expect(ids).toContain("transfer-b");
    expect(ids).not.toContain("in-progress-id");
  });

  it("removes a transfer via DELETE channel event", async () => {
    queryMock.range.mockResolvedValueOnce({
      data: [TRANSFER_A, TRANSFER_B],
    });

    const { result } = renderHook(() => useUserTransfersRealtime());
    await waitFor(() => expect(result.current.transfers.length).toBeGreaterThan(0));

    act(() => {
      channelHandlers["DELETE"]?.({ old: { id: "transfer-a" } });
    });

    expect(result.current.transfers.find((t) => t.id === "transfer-a")).toBeUndefined();
  });

  it("updates a transfer via UPDATE channel event", async () => {
    queryMock.range.mockResolvedValueOnce({ data: [TRANSFER_A] });

    const { result } = renderHook(() => useUserTransfersRealtime());
    await waitFor(() => expect(result.current.transfers.length).toBeGreaterThan(0));

    act(() => {
      channelHandlers["UPDATE"]?.({
        new: { ...TRANSFER_A, status: "failed", id: "transfer-a" },
      });
    });

    expect(result.current.transfers.find((t) => t.id === "transfer-a")?.status).toBe("failed");
  });

  it("optimistically removes a transfer via removeTransfer()", async () => {
    queryMock.range.mockResolvedValueOnce({
      data: [TRANSFER_A, TRANSFER_B],
    });

    const { result } = renderHook(() => useUserTransfersRealtime());
    await waitFor(() => expect(result.current.transfers.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.removeTransfer("transfer-a");
    });

    expect(result.current.transfers.find((t) => t.id === "transfer-a")).toBeUndefined();
    expect(deleteTransferMock).toHaveBeenCalledWith("transfer-a");
  });

  it("optimistically removes multiple transfers via removeMultipleTransfers()", async () => {
    queryMock.range.mockResolvedValueOnce({
      data: [TRANSFER_A, TRANSFER_B],
    });

    const { result } = renderHook(() => useUserTransfersRealtime());
    await waitFor(() => expect(result.current.transfers.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.removeMultipleTransfers(["transfer-a", "transfer-b"]);
    });

    expect(result.current.transfers).toHaveLength(0);
    expect(deleteMultipleMock).toHaveBeenCalledWith(["transfer-a", "transfer-b"]);
  });

  it("calls removeChannel on unmount", async () => {
    queryMock.range.mockResolvedValueOnce({ data: [] });

    const { unmount } = renderHook(() => useUserTransfersRealtime());
    await waitFor(() => channelMock.subscribe.mock.calls.length > 0);

    unmount();

    expect(supabaseMock.removeChannel).toHaveBeenCalledWith(channelMock);
  });

  it("exposes refresh() that re-fetches transfers", async () => {
    queryMock.range
      .mockResolvedValueOnce({ data: [TRANSFER_A] })
      .mockResolvedValueOnce({ data: [TRANSFER_A, TRANSFER_B] });

    const { result } = renderHook(() => useUserTransfersRealtime());
    await waitFor(() => expect(result.current.transfers).toHaveLength(1));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.transfers).toHaveLength(2);
  });
});
