/**
 * Regression — Supabase SSR server client (server.ts)
 *
 * SEC smoke test: verifies that the server-side Supabase client is created
 * with the SSR cookie adapter (createServerClient from @supabase/ssr), not
 * the localStorage-based createClient from @supabase/supabase-js.
 *
 * The same class of bug that caused the dashboard auth loop would be caught
 * here if someone reverted to the wrong import.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks so factory functions can reference them ────────────────

const { mockCreateServerClient, mockCookieStore } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(() => ({ auth: {} })),
  mockCookieStore: { get: vi.fn(), set: vi.fn() },
}));

// ─── Mock next/headers ──────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// ─── Mock @supabase/ssr ─────────────────────────────────────────────────

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

// ─── Env vars ───────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import { createClient } from "../server";

describe("Supabase server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses createServerClient from @supabase/ssr (not localStorage-based createClient)", async () => {
    await createClient();
    expect(mockCreateServerClient).toHaveBeenCalledOnce();
  });

  it("passes the correct Supabase URL and anon key", async () => {
    await createClient();
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.any(Object)
    );
  });

  it("provides a cookies adapter with get/set/remove", async () => {
    await createClient();
    const cookieOptions = (mockCreateServerClient.mock.calls[0] as unknown[])[2] as {
      cookies: { get: Function; set: Function; remove: Function };
    };
    expect(typeof cookieOptions.cookies.get).toBe("function");
    expect(typeof cookieOptions.cookies.set).toBe("function");
    expect(typeof cookieOptions.cookies.remove).toBe("function");
  });

  it("cookie get delegates to the cookie store", async () => {
    mockCookieStore.get.mockReturnValue({ value: "session-token" });

    await createClient();
    const { cookies: adapter } = (mockCreateServerClient.mock.calls[0] as unknown[])[2] as {
      cookies: { get: (name: string) => string | undefined };
    };

    const val = adapter.get("sb-access-token");
    expect(mockCookieStore.get).toHaveBeenCalledWith("sb-access-token");
    expect(val).toBe("session-token");
  });

  it("cookie get returns undefined when cookie is absent", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    await createClient();
    const { cookies: adapter } = (mockCreateServerClient.mock.calls[0] as unknown[])[2] as {
      cookies: { get: (name: string) => string | undefined };
    };

    expect(adapter.get("missing")).toBeUndefined();
  });

  it("cookie set delegates to the cookie store without throwing", async () => {
    await createClient();
    const { cookies: adapter } = (mockCreateServerClient.mock.calls[0] as unknown[])[2] as {
      cookies: { set: (name: string, value: string, opts: object) => void };
    };

    expect(() => adapter.set("sb-token", "abc", { maxAge: 3600 })).not.toThrow();
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: "sb-token", value: "abc" })
    );
  });

  it("cookie set swallows errors (Server Component constraint)", async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error("Cannot set cookies in Server Component");
    });

    await createClient();
    const { cookies: adapter } = (mockCreateServerClient.mock.calls[0] as unknown[])[2] as {
      cookies: { set: (name: string, value: string, opts: object) => void };
    };

    expect(() => adapter.set("sb-token", "abc", {})).not.toThrow();
  });

  it("cookie remove sets value to empty string without throwing", async () => {
    await createClient();
    const { cookies: adapter } = (mockCreateServerClient.mock.calls[0] as unknown[])[2] as {
      cookies: { remove: (name: string, opts: object) => void };
    };

    expect(() => adapter.remove("sb-token", {})).not.toThrow();
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: "sb-token", value: "" })
    );
  });
});
