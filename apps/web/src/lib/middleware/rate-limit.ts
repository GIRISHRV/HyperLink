/**
 * SEC-013: Simple edge-compatible in-memory rate limiter for Next.js API routes.
 *
 * Uses a sliding-window counter keyed by IP address. Designed for low-traffic
 * endpoints; for high-scale use Upstash Redis or Vercel Edge rate limiting.
 *
 * ⚠️  D1 KNOWN LIMITATION: On Vercel serverless (and other FaaS platforms),
 * each Lambda invocation gets its own fresh Map, so this limiter resets on
 * every cold start. It provides burst protection within a single function
 * instance but offers no protection against distributed attacks across
 * multiple instances.
 *
 * TODO (D1): Upgrade to a Redis-backed solution for production-scale
 * protection. Recommended options:
 *   - Upstash Redis (@upstash/ratelimit) — edge-compatible, pay-per-use
 *   - Vercel Edge Middleware rate limiting — built-in, no extra infra
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   const { limited, headers } = limiter(request);
 *   if (limited) return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers });
 */

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests per window */
  max: number;
  /** Human-readable message returned in the 429 body */
  message?: string;
}

interface RateLimitResult {
  /** true if the request should be blocked */
  limited: boolean;
  /** Headers to include in every response (Retry-After, X-RateLimit-*) */
  headers: Record<string, string>;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * Create a rate limiter function.
 * Each limiter has its own isolated counter store — endpoints don't share state.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, message = "Too many requests, please slow down." } = options;

  // In-memory store: Map<ip → WindowEntry>
  // On serverless/Edge, each cold start gets a fresh map — acceptable for burst protection.
  const store = new Map<string, WindowEntry>();

  return function rateLimit(request: Request): RateLimitResult & { message: string } {
    // Extract client IP — Next.js passes it via x-forwarded-for on Vercel
    const forwarded = (request as { headers: Headers }).headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    let count: number;
    let resetAt: number;

    if (!entry || now >= entry.resetAt) {
      // New window
      count = 1;
      resetAt = now + windowMs;
      store.set(ip, { count, resetAt });
    } else {
      count = entry.count + 1;
      resetAt = entry.resetAt;
      store.set(ip, { count, resetAt });
    }

    const remaining = Math.max(0, max - count);
    const retryAfterSec = Math.ceil((resetAt - now) / 1000);

    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(max),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
    };

    if (count > max) {
      headers["Retry-After"] = String(retryAfterSec);
    }

    return {
      limited: count > max,
      headers,
      message,
    };
  };
}

/** Pre-configured limiters for common endpoint types */
export const turnCredentialsLimiter = createRateLimiter({
  windowMs: 60_000, // 1 minute
  max: 10, // TURN credentials are fetched once on mount — 10/min is generous
  message: "Too many TURN credential requests. Please wait before trying again.",
});

export const incidentsLimiter = createRateLimiter({
  windowMs: 60_000, // 1 minute
  max: 30, // Status page polling
  message: "Too many requests to the incidents API.",
});

export const healthLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: "Too many health check requests.",
});
