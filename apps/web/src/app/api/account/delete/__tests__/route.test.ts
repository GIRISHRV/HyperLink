/**
 * E2 — Unit tests for DELETE /api/account/delete
 *
 * Tests all 5 distinct code paths:
 *   1. Unauthenticated request → 401
 *   2. Auth error from Supabase → 401
 *   3. SUPABASE_SERVICE_ROLE_KEY not configured → 503
 *   4. Admin deleteUser fails → 500
 *   5. Unexpected throw → 500
 *   6. Happy path — authenticated + service role key → 200 { success: true }
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSignOut = vi.fn(async () => ({ error: null }));
const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "user-uuid-123" } },
  error: null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  })),
}));

// Track calls to the supabase-js admin client
const mockDeleteUser = vi.fn(async () => ({ error: null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
  })),
}));

vi.mock("@repo/utils", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/account/delete", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    };
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123" } },
      error: null,
    });
    mockDeleteUser.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it("returns 200 { success: true } for authenticated user with valid service role key", async () => {
    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteUser).toHaveBeenCalledWith("user-uuid-123");
    expect(mockSignOut).toHaveBeenCalled();
  });

  // ── Auth guard ──────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated (no user)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null } as any);

    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("returns 401 when Supabase auth.getUser returns an error", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "JWT expired" },
    } as any);

    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  // ── Service role key guard ───────────────────────────────────────────────

  it("returns 503 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("not configured");
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("returns 503 when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("not configured");
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  // ── Admin delete failure ─────────────────────────────────────────────────

  it("returns 500 when admin.deleteUser returns an error", async () => {
    mockDeleteUser.mockResolvedValueOnce({
      error: { message: "User not found" },
    } as any);

    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("Failed to delete account");
    // signOut should NOT be called — account deletion failed
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  // ── Unexpected throw ─────────────────────────────────────────────────────

  it("returns 500 on unexpected thrown error", async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error("Network timeout"));

    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });

  // ── Idempotency guard — signOut is best-effort ───────────────────────────

  it("still returns 200 even if signOut fails after successful deletion", async () => {
    mockSignOut.mockResolvedValueOnce({ error: { message: "already signed out" } } as any);

    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    // The user is already deleted — signOut failure must not bubble up as an error
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
