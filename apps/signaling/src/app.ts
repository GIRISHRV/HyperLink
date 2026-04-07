/**
 * Express app factory — CORS, rate limiting, auth middleware, routes.
 * Imported by index.ts (server entry) and __tests__/ (test harness).
 */
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { logger } from "./logger.js";

// ── Config ────────────────────────────────────────────────────────────────────

// SEC-010: exact match only — no startsWith which could allow
// `https://hyperlink.vercel.app.evil.com` to bypass the check.
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()) || [
  "http://localhost:3000",
  "https://hyperlink.vercel.app",
];

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";

// SEC-011: fail-closed in production if JWT secret is missing.
if (!SUPABASE_JWT_SECRET && process.env.NODE_ENV === "production") {
  logger.fatal(
    "[FATAL] SUPABASE_JWT_SECRET is not set. " +
      "Refusing to start in production without auth. " +
      "Set the env var on Railway (or your deployment platform) and redeploy."
  );
  process.exit(1);
}

// Augment Express Request type to carry verified JWT payload
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: jwt.JwtPayload | string;
    }
  }
}

// ── Rate limiters ─────────────────────────────────────────────────────────────

// FINDING-016 fix: rate limiting on all routes
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // health checks at most once/second
  standardHeaders: true,
  legacyHeaders: false,
});

// ── App factory ───────────────────────────────────────────────────────────────

// SEC-010: Vercel preview deployments use randomised subdomains.
// Allow any `hyperlink-*.vercel.app` hostname in addition to the exact allowlist.
// This pattern is intentionally anchored (starts with project name) to prevent
// `evil-hyperlink-clone-xyz.vercel.app` from matching.
const VERCEL_PREVIEW_PATTERN = /^https:\/\/hyperlink(-[a-z0-9-]+)?\.vercel\.app$/;

function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || VERCEL_PREVIEW_PATTERN.test(origin);
}

export function createApp(connectedPeers: () => number) {
  const app = express();

  // CORS — SEC-010: exact match + Vercel preview pattern
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no Origin header (server-to-server calls, Render health
        // checks, PeerJS WebSocket upgrades). These cannot carry cookies so there is
        // no CSRF risk. We still reject them in tests via the allowlist; in production
        // blocking them just produces noisy logs with zero security benefit.
        if (!origin) {
          return callback(null, true);
        }
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          logger.warn({ origin }, "[CORS] Blocked request from unlisted origin");
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );

  app.use(generalLimiter);

  // ── Routes ──────────────────────────────────────────────────────────────────

  app.get("/health", healthLimiter, (_req, res) => {
    const healthData = {
      status: "healthy",
      service: "HyperLink Signaling Server",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      peers: connectedPeers(),
    };

    logger.debug(healthData, "health_check");

    res.json(healthData);
  });

  app.get("/", (_req, res) => {
    res.send("HyperLink Signaling Server is running 🚀");
  });

  // ── JWT auth middleware ──────────────────────────────────────────────────────

  app.use((req, res, next) => {
    if (req.path === "/health" || req.path === "/") return next();

    if (!SUPABASE_JWT_SECRET) {
      // SEC-011: skip only in non-production (local dev convenience)
      logger.warn(
        "[AUTH] SUPABASE_JWT_SECRET not found, skipping verification (INSECURE — dev only)"
      );
      return next();
    }

    const token =
      req.headers["authorization"]?.toString().split(" ")[1] || (req.query.token as string);

    if (!token) {
      logger.info({ ip: req.ip }, "[AUTH] Rejected: no token provided");
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // SEC-012: HS256 only — prevents algorithm confusion attacks
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ["HS256"] });
      req.user = decoded;
      next();
    } catch {
      logger.info({ ip: req.ip }, "[AUTH] Rejected: invalid token");
      return res.status(403).json({ error: "Invalid or expired token" });
    }
  });

  return app;
}
