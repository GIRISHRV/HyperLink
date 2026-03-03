/**
 * Phase 2 — Middleware (middleware.ts)
 *
 * Tests for: auth enforcement middleware
 *
 * Validates: protected path redirects, public path passthrough,
 * POST request handling, redirect-to-original-path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @supabase/ssr ─────────────────────────────────────────────────

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// ─── Mock env vars ──────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

function createRequest(url: string, method = "GET"): NextRequest {
  return new NextRequest(new Request(url, { method }));
}

describe("Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Public routes ────────────────────────────────────────────────────

  it("passes through unprotected paths", async () => {
    const req = createRequest("https://app.example.com/about");
    const res = await middleware(req);

    expect(res.status).toBe(200);
    // No redirect
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes through the home page", async () => {
    const req = createRequest("https://app.example.com/");
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it("passes through auth page", async () => {
    const req = createRequest("https://app.example.com/auth");
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  // ─── Protected routes: authenticated user ────────────────────────────

  it("allows authenticated users to access /dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const req = createRequest("https://app.example.com/dashboard");
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows authenticated users to access /settings", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const req = createRequest("https://app.example.com/settings");
    const res = await middleware(req);

    expect(res.status).toBe(200);
  });

  // ─── Protected routes: unauthenticated user ──────────────────────────

  it("redirects unauthenticated users from /dashboard to /auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createRequest("https://app.example.com/dashboard");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth");
    expect(location).toContain("redirect=%2Fdashboard");
  });

  it("redirects unauthenticated users from /history to /auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createRequest("https://app.example.com/history");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth");
  });

  it("redirects unauthenticated from /settings with redirect param", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createRequest("https://app.example.com/settings");
    const res = await middleware(req);

    const location = res.headers.get("location")!;
    expect(location).toContain("redirect=%2Fsettings");
  });

  it("redirects unauthenticated from /send", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createRequest("https://app.example.com/send");
    const res = await middleware(req);

    expect(res.status).toBe(307);
  });

  it("redirects unauthenticated from /receive", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createRequest("https://app.example.com/receive");
    const res = await middleware(req);

    expect(res.status).toBe(307);
  });

  // ─── POST request handling (Share Target) ─────────────────────────────

  it("redirects POST to /send with shared param", async () => {
    const req = createRequest("https://app.example.com/send", "POST");
    const res = await middleware(req);

    expect(res.status).toBe(303);
    const location = res.headers.get("location");
    expect(location).toContain("/send?shared=middleware_bypass");
  });

  it("redirects POST to /api/share-target", async () => {
    const req = createRequest("https://app.example.com/api/share-target", "POST");
    const res = await middleware(req);

    expect(res.status).toBe(303);
    const location = res.headers.get("location");
    expect(location).toContain("/send?shared=middleware_bypass");
  });

  // ─── Sub-paths ────────────────────────────────────────────────────────

  it("protects sub-paths under /dashboard/*", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createRequest("https://app.example.com/dashboard/transfers");
    const res = await middleware(req);

    expect(res.status).toBe(307);
  });

  it("protects sub-paths under /send/*", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createRequest("https://app.example.com/send/somepath");
    const res = await middleware(req);

    expect(res.status).toBe(307);
  });
});
