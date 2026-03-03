/**
 * Regression test: Supabase browser client must use createBrowserClient
 * (@supabase/ssr) so auth tokens are stored in cookies — readable by the
 * server-side middleware. Using createClient (@supabase/supabase-js) stores
 * tokens in localStorage, which the middleware cannot access, causing an
 * infinite auth redirect loop on /dashboard.
 *
 * Bug: auth redirect loop — user signs in, middleware redirects to /auth
 *      because it reads cookies (empty), auth page reads localStorage (has token),
 *      redirects to /dashboard → infinite loop.
 * Fix: switch from createClient → createBrowserClient (cookie storage).
 */
import { vi, describe, it, expect } from "vitest";

// Stub env vars before the module is loaded
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

const { mockCreateBrowserClient, mockClient } = vi.hoisted(() => {
  const mockClient = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  };
  const mockCreateBrowserClient = vi.fn().mockReturnValue(mockClient);
  return { mockCreateBrowserClient, mockClient };
});

// Mock @supabase/ssr — NOT @supabase/supabase-js
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

describe("supabase browser client", () => {
  it("calls createBrowserClient — NOT createClient — for cookie-based sessions", async () => {
    await import("@/lib/supabase/client");
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    );
  });

  it("exports the client instance returned by createBrowserClient", async () => {
    const { supabase } = await import("@/lib/supabase/client");
    expect(supabase).toBe(mockClient);
  });

  it("exported client has auth interface", async () => {
    const { supabase } = await import("@/lib/supabase/client");
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.auth.getUser).toBe("function");
  });
});
