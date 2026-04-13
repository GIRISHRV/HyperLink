/**
 * API route tests
 *
 * Covers:
 * - GET /api/health
 * - GET /api/keep-alive
 * - GET /api/turn-credentials
 * - POST /api/share-target
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockGetUser, mockLimit, mockSelect, mockFrom, createClientMock, loggerMock } = vi.hoisted(
  () => {
    const mockGetUser = vi.fn(async () => ({ data: { user: { id: "test-user" } }, error: null }));
    const mockLimit = vi.fn(
      async (): Promise<{ error: { message: string } | null }> => ({ error: null })
    );
    const mockSelect = vi.fn(() => ({ limit: mockLimit }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));

    const createClientMock = vi.fn(async () => ({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    }));

    const loggerMock = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    return { mockGetUser, mockLimit, mockSelect, mockFrom, createClientMock, loggerMock };
  }
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@repo/utils", () => ({
  logger: loggerMock,
}));

const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };

  mockGetUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue({ error: null });
});

afterEach(() => {
  process.env = originalEnv;
  vi.unstubAllGlobals();
});

// ─── Health endpoint ────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const { GET } = await import("../health/route");
    const request = new Request("http://localhost/api/health");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await GET(nextReq);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("HyperLink Web");
    expect(body.timestamp).toBeTruthy();
  });

  it("returns a valid ISO timestamp", async () => {
    const { GET } = await import("../health/route");
    const request = new Request("http://localhost/api/health");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await GET(nextReq);
    const body = await response.json();

    const date = new Date(body.timestamp);
    expect(date.toISOString()).toBe(body.timestamp);
  });

  it("performs deep health check when deep=true", async () => {
    const { GET } = await import("../health/route");
    const request = new Request("http://localhost/api/health?deep=true");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await GET(nextReq);
    const body = await response.json();

    expect(body.checks).toBeDefined();
    expect(body.checks.supabase).toBeDefined();
  });

  it("sanitizes deep health error messages", async () => {
    mockLimit.mockResolvedValueOnce({
      error: { message: "db connection refused: internal details" },
    });

    const { GET } = await import("../health/route");
    const request = new Request("http://localhost/api/health?deep=true");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await GET(nextReq);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.checks.supabase.status).toBe("error");
    expect(body.checks.supabase.message).toBe("Connectivity check failed");
  });
});

// ─── Keep-alive endpoint ────────────────────────────────────────────────

describe("GET /api/keep-alive", () => {
  it("returns 503 when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;

    const { GET } = await import("../keep-alive/route");
    const request = new Request("http://localhost/api/keep-alive", {
      headers: {
        authorization: "Bearer some-secret",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("not configured");
  });

  it("returns 401 for unauthorized callers", async () => {
    process.env.CRON_SECRET = "expected-secret";

    const { GET } = await import("../keep-alive/route");
    const request = new Request("http://localhost/api/keep-alive");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 200 for authorized cron request", async () => {
    process.env.CRON_SECRET = "expected-secret";
    process.env.RENDER_SIGNALING_URL = "https://signaling.example.com";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "healthy" }),
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { GET } = await import("../keep-alive/route");
    const request = new Request("http://localhost/api/keep-alive", {
      headers: {
        authorization: "Bearer expected-secret",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.pings.supabase).toBe("ok");
    expect(body.pings.signaling).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://signaling.example.com/health",
      expect.any(Object)
    );
  });
});

// ─── TURN credentials endpoint ──────────────────────────────────────────

describe("GET /api/turn-credentials", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockGetUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  });

  it("returns STUN servers and public TURN fallback when no TURN_URL env", async () => {
    delete process.env.TURN_URL;
    const { GET } = await import("../turn-credentials/route");
    const response = await GET(new Request("http://localhost/api/turn-credentials"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.iceServers).toBeDefined();
    expect(body.iceServers.length).toBeGreaterThanOrEqual(2);

    const stunServers = body.iceServers.filter((s: RTCIceServer) =>
      typeof s.urls === "string" ? s.urls.startsWith("stun:") : false
    );
    expect(stunServers.length).toBeGreaterThanOrEqual(1);

    const turnServers = body.iceServers.filter((s: RTCIceServer) =>
      typeof s.urls === "string" ? s.urls.startsWith("turn:") : false
    );
    expect(turnServers.length).toBeGreaterThanOrEqual(1);
  });

  it("uses private TURN server when TURN_URL env is set", async () => {
    process.env.TURN_URL = "turn:private.example.com:3478";
    process.env.TURN_USERNAME = "user";
    process.env.TURN_CREDENTIAL = "secret";

    const { GET } = await import("../turn-credentials/route");
    const response = await GET(new Request("http://localhost/api/turn-credentials"));
    const body = await response.json();

    const privateTurn = body.iceServers.find(
      (s: RTCIceServer) => s.urls === "turn:private.example.com:3478"
    );
    expect(privateTurn).toBeDefined();
    expect(privateTurn.username).toBe("user");
    expect(privateTurn.credential).toBe("secret");
  });

  it("supports multiple TURN providers", async () => {
    process.env.TURN_URL = "turn:provider1.com:3478";
    process.env.TURN_USERNAME = "user1";
    process.env.TURN_CREDENTIAL = "pass1";
    process.env.TURN_URL_2 = "turn:provider2.com:3478";
    process.env.TURN_USERNAME_2 = "user2";
    process.env.TURN_CREDENTIAL_2 = "pass2";

    const { GET } = await import("../turn-credentials/route");
    const response = await GET(new Request("http://localhost/api/turn-credentials"));
    const body = await response.json();

    const p1 = body.iceServers.find((s: RTCIceServer) => s.urls === "turn:provider1.com:3478");
    const p2 = body.iceServers.find((s: RTCIceServer) => s.urls === "turn:provider2.com:3478");

    expect(p1).toBeDefined();
    expect(p1.username).toBe("user1");
    expect(p2).toBeDefined();
    expect(p2.username).toBe("user2");
  });

  it("sets proper Cache-Control header", async () => {
    const { GET } = await import("../turn-credentials/route");
    const response = await GET(new Request("http://localhost/api/turn-credentials"));

    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
  });
});

// ─── Share Target endpoint ──────────────────────────────────────────────

describe("POST /api/share-target", () => {
  it("redirects to /send with fallback flag for valid request", async () => {
    const { POST } = await import("../share-target/route");

    const request = new Request("https://app.example.com/api/share-target", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        "content-length": "1024",
      },
    });

    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await POST(nextReq);
    expect(response.status).toBe(303);
    const location = response.headers.get("location");
    expect(location).toContain("/send?shared=failed_sw_bypass");
  });

  it("rejects mismatched origin with 403", async () => {
    const { POST } = await import("../share-target/route");

    const request = new Request("https://app.example.com/api/share-target", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
        "content-length": "100",
      },
    });

    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await POST(nextReq);
    expect(response.status).toBe(403);
  });

  it("rejects malformed origin values with 403", async () => {
    const { POST } = await import("../share-target/route");

    const request = new Request("https://app.example.com/api/share-target", {
      method: "POST",
      headers: {
        origin: "not-a-valid-origin",
        "content-length": "100",
      },
    });

    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await POST(nextReq);
    expect(response.status).toBe(403);
  });

  it("rejects oversized payloads with 413", async () => {
    const { POST } = await import("../share-target/route");

    const request = new Request("https://app.example.com/api/share-target", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        "content-length": String(200 * 1024 * 1024),
      },
    });

    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await POST(nextReq);
    expect(response.status).toBe(413);
  });

  it("allows requests without origin header", async () => {
    const { POST } = await import("../share-target/route");

    const request = new Request("https://app.example.com/api/share-target", {
      method: "POST",
      headers: {
        "content-length": "1024",
      },
    });

    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(request);

    const response = await POST(nextReq);
    expect(response.status).toBe(303);
  });
});
