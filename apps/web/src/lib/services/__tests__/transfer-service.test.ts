/**
 * Phase 2 — Transfer Service (transfer-service.ts)
 *
 * Tests for: createTransfer, updateTransferStatus, claimTransferAsReceiver,
 * getUserTransfers, deleteTransfer, deleteMultipleTransfers, getUserTransferStats
 *
 * All Supabase calls mocked at the module level.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup ─────────────────────────────────────────────────────────

function createQueryBuilder(resolvedData: unknown = null, resolvedError: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  for (const m of ["select", "insert", "update", "delete", "eq", "in", "or", "order"]) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }

  builder.single = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });

  // Allow direct await
  builder.then = vi.fn((resolve) =>
    resolve({ data: resolvedData ? (Array.isArray(resolvedData) ? resolvedData : [resolvedData]) : [], error: resolvedError })
  );

  return builder;
}

let currentBuilder = createQueryBuilder();

const { mockSupabase } = vi.hoisted(() => {
  return {
    mockSupabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: mockSupabase,
}));

vi.mock("@repo/utils", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/utils/with-retry", () => ({
  withRetry: vi.fn((fn: () => unknown) => fn()),
}));

import {
  createTransfer,
  updateTransferStatus,
  claimTransferAsReceiver,
  getUserTransfers,
  deleteTransfer,
  deleteMultipleTransfers,
  getUserTransferStats,
} from "../transfer-service";

describe("Transfer Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentBuilder = createQueryBuilder();
    mockSupabase.from.mockReturnValue(currentBuilder);
  });

  // ─── createTransfer ───────────────────────────────────────────────────

  describe("createTransfer", () => {
    it("creates a transfer and returns the record", async () => {
      const transfer = {
        id: "t1",
        filename: "test.pdf",
        file_size: 1024,
        sender_id: "u1",
        status: "pending",
      };
      currentBuilder = createQueryBuilder(transfer);
      mockSupabase.from.mockReturnValue(currentBuilder);

      const result = await createTransfer("u1", {
        filename: "test.pdf",
        fileSize: 1024,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("transfers");
      expect(currentBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "test.pdf",
          file_size: 1024,
          sender_id: "u1",
          status: "pending",
        })
      );
      expect(result).toEqual(transfer);
    });

    it("returns null on error", async () => {
      currentBuilder = createQueryBuilder(null, { message: "DB error" });
      mockSupabase.from.mockReturnValue(currentBuilder);

      const result = await createTransfer("u1", {
        filename: "test.pdf",
        fileSize: 1024,
      });

      expect(result).toBeNull();
    });
  });

  // ─── updateTransferStatus ─────────────────────────────────────────────

  describe("updateTransferStatus", () => {
    it("updates status and returns true", async () => {
      const builder = createQueryBuilder();
      builder.eq = vi.fn().mockResolvedValue({ data: null, error: null });
      builder.update = vi.fn().mockReturnValue(builder);
      mockSupabase.from.mockReturnValue(builder);

      const result = await updateTransferStatus("t1", "complete");
      expect(result).toBe(true);
    });

    it("returns false on error", async () => {
      const builder = createQueryBuilder();
      builder.eq = vi.fn().mockResolvedValue({ data: null, error: { message: "err" } });
      builder.update = vi.fn().mockReturnValue(builder);
      mockSupabase.from.mockReturnValue(builder);

      const result = await updateTransferStatus("t1", "failed");
      expect(result).toBe(false);
    });

    it("sets completed_at when status is 'complete'", async () => {
      const builder = createQueryBuilder();
      builder.eq = vi.fn().mockResolvedValue({ data: null, error: null });
      builder.update = vi.fn().mockReturnValue(builder);
      mockSupabase.from.mockReturnValue(builder);

      await updateTransferStatus("t1", "complete");

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "complete",
          completed_at: expect.any(String),
        })
      );
    });
  });

  // ─── claimTransferAsReceiver ──────────────────────────────────────────

  describe("claimTransferAsReceiver", () => {
    it("calls RPC with correct params", async () => {
      const transfer = { id: "t1", receiver_id: "r1" };
      mockSupabase.rpc.mockResolvedValue({ data: transfer, error: null });

      const result = await claimTransferAsReceiver("t1");

      expect(mockSupabase.rpc).toHaveBeenCalledWith("claim_transfer", {
        p_transfer_id: "t1",
      });
      expect(result).toEqual(transfer);
    });

    it("returns null on RPC error", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: "RPC failed" } });

      const result = await claimTransferAsReceiver("t1");
      expect(result).toBeNull();
    });
  });

  // ─── getUserTransfers ─────────────────────────────────────────────────

  describe("getUserTransfers", () => {
    it("returns transfer list", async () => {
      const transfers = [
        { id: "t1", filename: "a.txt" },
        { id: "t2", filename: "b.txt" },
      ];
      currentBuilder = createQueryBuilder(transfers);
      // Override then to return flat array
      currentBuilder.then = vi.fn((resolve) =>
        resolve({ data: transfers, error: null })
      );
      mockSupabase.from.mockReturnValue(currentBuilder);

      const result = await getUserTransfers("u1");
      expect(result).toEqual(transfers);
    });

    it("returns empty array on error", async () => {
      currentBuilder = createQueryBuilder(null, { message: "error" });
      currentBuilder.then = vi.fn((resolve) =>
        resolve({ data: null, error: { message: "error" } })
      );
      mockSupabase.from.mockReturnValue(currentBuilder);

      const result = await getUserTransfers("u1");
      expect(result).toEqual([]);
    });
  });

  // ─── deleteTransfer ───────────────────────────────────────────────────

  describe("deleteTransfer", () => {
    it("returns true on success", async () => {
      const builder = createQueryBuilder();
      builder.eq = vi.fn().mockResolvedValue({ data: null, error: null });
      builder.delete = vi.fn().mockReturnValue(builder);
      mockSupabase.from.mockReturnValue(builder);

      const result = await deleteTransfer("t1");
      expect(result).toBe(true);
    });

    it("returns false on error", async () => {
      const builder = createQueryBuilder();
      builder.eq = vi.fn().mockResolvedValue({ data: null, error: { message: "no perm" } });
      builder.delete = vi.fn().mockReturnValue(builder);
      mockSupabase.from.mockReturnValue(builder);

      const result = await deleteTransfer("t1");
      expect(result).toBe(false);
    });
  });

  // ─── deleteMultipleTransfers ──────────────────────────────────────────

  describe("deleteMultipleTransfers", () => {
    it("returns true for empty array", async () => {
      const result = await deleteMultipleTransfers([]);
      expect(result).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("deletes multiple transfers", async () => {
      const builder = createQueryBuilder();
      builder.delete = vi.fn().mockReturnValue(builder);
      builder.in = vi.fn().mockReturnValue(builder);
      builder.select = vi.fn().mockResolvedValue({ data: [{ id: "t1" }, { id: "t2" }], error: null });
      mockSupabase.from.mockReturnValue(builder);

      const result = await deleteMultipleTransfers(["t1", "t2"]);
      expect(result).toBe(true);
    });
  });

  // ─── getUserTransferStats ─────────────────────────────────────────────

  describe("getUserTransferStats", () => {
    it("returns stats from RPC and is called with NO parameters (SEC-007)", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ total_transfers: 5, total_bytes_sent: 1048576 }],
        error: null,
      });

      const stats = await getUserTransferStats();
      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_user_transfer_stats");
      // Check it was called with exactly 1 argument (the function name), enforcing IDOR mitigation
      expect(mockSupabase.rpc.mock.calls[0].length).toBe(1);

      expect(stats.totalTransfers).toBe(5);
      expect(stats.totalBytesSent).toBe(1048576);
    });

    it("handles legacy total_bytes field", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ total_transfers: 3, total_bytes: 500 }],
        error: null,
      });

      const stats = await getUserTransferStats();
      expect(stats.totalBytesSent).toBe(500);
    });

    it("returns zeros on error", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC fail" },
      });

      const stats = await getUserTransferStats();
      expect(stats.totalTransfers).toBe(0);
      expect(stats.totalBytesSent).toBe(0);
    });

    it("returns zeros for empty result set", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const stats = await getUserTransferStats();
      expect(stats.totalTransfers).toBe(0);
      expect(stats.totalBytesSent).toBe(0);
    });
  });
});
