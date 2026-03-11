/**
 * E3 — Signaling Server Integration Tests
 *
 * Imports createApp() from app.ts directly — no PeerServer or HTTP listener needed.
 * This gives clean, fast unit-style tests for all Express middleware.
 *
 * Covers:
 *   - GET /health   — shape, rate limiter headers, public access
 *   - GET /         — root endpoint
 *   - CORS          — allowed origins, blocked origins, prefix-spoof prevention
 *   - JWT auth      — no token, invalid token, wrong secret, query param, valid header/query
 *   - Auth disabled — warns and skips in dev mode (no secret)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// Each vi.resetModules() re-registers SIGTERM/SIGINT handlers — raise limit to avoid noise.
process.setMaxListeners(50);

const TEST_SECRET = "test-jwt-secret";

function makeToken(payload: object = { sub: "user-123", role: "authenticated" }) {
  return jwt.sign(payload, TEST_SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

async function importApp() {
  const { createApp } = await import("../src/app.js");
  return createApp(() => 0); // peer count always 0 in tests
}

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.NODE_ENV = "test";
  });

  it("returns 200 with correct shape", async () => {
    const app = await importApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("HyperLink Signaling Server");
    expect(typeof res.body.uptime).toBe("number");
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof res.body.peers).toBe("number");
  });

  it("returns rate-limit headers", async () => {
    const app = await importApp();
    const res = await request(app).get("/health");

    expect(res.headers["ratelimit-limit"] ?? res.headers["x-ratelimit-limit"]).toBeDefined();
  });

  it("is publicly accessible without a JWT", async () => {
    const app = await importApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.NODE_ENV = "test";
  });

  it("returns 200 with running message", async () => {
    const app = await importApp();
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("HyperLink Signaling Server");
  });

  it("is publicly accessible without a JWT", async () => {
    const app = await importApp();
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("CORS enforcement (SEC-010)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    process.env.ALLOWED_ORIGINS = "http://localhost:3000,https://hyperlink.vercel.app";
    process.env.NODE_ENV = "test";
  });

  it("allows a whitelisted origin", async () => {
    const app = await importApp();
    const res = await request(app).get("/health").set("Origin", "http://localhost:3000");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("blocks an unlisted origin", async () => {
    const app = await importApp();
    const res = await request(app).get("/health").set("Origin", "https://evil.example.com");
    expect(res.headers["access-control-allow-origin"]).not.toBe("https://evil.example.com");
  });

  it("blocks prefix-spoofed origin (hyperlink.vercel.app.evil.com)", async () => {
    const app = await importApp();
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://hyperlink.vercel.app.evil.com");
    expect(res.headers["access-control-allow-origin"]).not.toBe(
      "https://hyperlink.vercel.app.evil.com"
    );
  });

  it("allows requests with no Origin header (mobile / Postman)", async () => {
    const app = await importApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("JWT authentication middleware (SEC-011 / SEC-012)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.NODE_ENV = "test";
  });

  it("rejects request with no token on a non-public path with 401", async () => {
    const app = await importApp();
    const res = await request(app).get("/protected-path");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("rejects an invalid token with 403", async () => {
    const app = await importApp();
    const res = await request(app)
      .get("/protected-path")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("rejects a token signed with the wrong secret with 403", async () => {
    const app = await importApp();
    const badToken = jwt.sign({ sub: "attacker" }, "wrong-secret", { algorithm: "HS256" });
    const res = await request(app)
      .get("/protected-path")
      .set("Authorization", `Bearer ${badToken}`);
    expect(res.status).toBe(403);
  });

  it("rejects a bad token passed via query param with 403", async () => {
    const app = await importApp();
    const res = await request(app).get("/protected-path?token=garbage");
    expect(res.status).toBe(403);
  });

  it("accepts a valid HS256 token via Authorization header", async () => {
    const app = await importApp();
    const token = makeToken();
    const res = await request(app).get("/protected-path").set("Authorization", `Bearer ${token}`);
    // Auth passes — Express returns 404 since /protected-path has no handler, not 401/403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("accepts a valid token passed as ?token= query param", async () => {
    const app = await importApp();
    const token = makeToken();
    const res = await request(app).get(`/protected-path?token=${token}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("public routes bypass auth with no token", async () => {
    const app = await importApp();
    expect((await request(app).get("/health")).status).toBe(200);
    expect((await request(app).get("/")).status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Auth-disabled dev mode (no SUPABASE_JWT_SECRET)", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SUPABASE_JWT_SECRET;
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.NODE_ENV = "test"; // NOT production — so no process.exit(1)
  });

  it("allows unauthenticated requests to protected routes in dev mode", async () => {
    const app = await importApp();
    const res = await request(app).get("/protected-path");
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
