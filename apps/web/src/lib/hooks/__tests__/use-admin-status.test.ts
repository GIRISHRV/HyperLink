// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAdminStatus } from "@/lib/hooks/use-admin-status";

const { queryBuilder, supabaseMock } = vi.hoisted(() => {
  const queryBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.single.mockResolvedValue({ data: { is_admin: false }, error: null });

  const supabaseMock = {
    from: vi.fn().mockReturnValue(queryBuilder),
  };

  return { queryBuilder, supabaseMock };
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: supabaseMock,
}));

vi.mock("@repo/utils", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("useAdminStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.single.mockResolvedValue({ data: { is_admin: false }, error: null });
  });

  it("returns false without user id", async () => {
    const { result } = renderHook(() => useAdminStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("returns true when profile is admin", async () => {
    queryBuilder.single.mockResolvedValueOnce({ data: { is_admin: true }, error: null });

    const { result } = renderHook(() => useAdminStatus("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(supabaseMock.from).toHaveBeenCalledWith("user_profiles");
  });

  it("returns false on query error", async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied" },
    });

    const { result } = renderHook(() => useAdminStatus("user-2"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
  });
});
