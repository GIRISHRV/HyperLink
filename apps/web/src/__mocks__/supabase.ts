/**
 * Shared Supabase client mock for all test files.
 * Provides chainable builder pattern matching the real Supabase JS SDK.
 *
 * Usage in tests:
 *   vi.mock("@/lib/supabase/client", () => import("@/__mocks__/supabase"));
 */
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Query builder mock (chainable)
// ---------------------------------------------------------------------------
function createQueryBuilder(resolvedData: unknown = null, resolvedError: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainable = (method: string) => {
    builder[method] = vi.fn().mockReturnValue(builder);
    return builder;
  };

  // Every chainable method returns the builder itself
  for (const m of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "is",
    "in",
    "contains",
    "containedBy",
    "or",
    "order",
    "limit",
    "range",
    "maybeSingle",
  ]) {
    chainable(m);
  }

  // Terminal method: .single() resolves the chain
  builder.single = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });

  // Allow direct await on the builder (e.g. supabase.from("x").select("*"))
  builder.then = vi.fn((resolve) =>
    resolve({ data: resolvedData ? [resolvedData] : [], error: resolvedError })
  );

  return builder;
}

// ---------------------------------------------------------------------------
// Auth mock
// ---------------------------------------------------------------------------
const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

export const mockAuth: Record<string, any> = {
  signUp: vi
    .fn()
    .mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null }),
  signInWithPassword: vi
    .fn()
    .mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null }),
  signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
  onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
};

// ---------------------------------------------------------------------------
// RPC mock
// ---------------------------------------------------------------------------
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

// ---------------------------------------------------------------------------
// Realtime mock
// ---------------------------------------------------------------------------
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
};

// ---------------------------------------------------------------------------
// Main supabase export
// ---------------------------------------------------------------------------
export const supabase: Record<string, any> = {
  auth: mockAuth,
  from: vi.fn(() => createQueryBuilder()),
  rpc: mockRpc,
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

// Convenience helpers for tests to override from() return values
export function mockFromResponse(data: unknown, error: unknown = null) {
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(createQueryBuilder(data, error));
}

export function mockRpcResponse(data: unknown, error: unknown = null) {
  mockRpc.mockResolvedValue({ data, error });
}

// Re-export user/session for easy access in test assertions
export { mockUser, mockSession };
