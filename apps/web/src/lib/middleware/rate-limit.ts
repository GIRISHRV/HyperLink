/**
 * Production-ready rate limiter with Redis backend for distributed protection.
 * Falls back to in-memory for development/edge cases.
 */

import { logger } from "@repo/utils";

// Optional Redis import - only available if installed
let Redis: any = null;
let redisImportPromise: Promise<void> | null = null;

// Lazy load Redis using dynamic import for ESM consistency
if (typeof window === "undefined") {
  redisImportPromise = import("@upstash/redis")
    .then((module) => {
      Redis = module.Redis;
    })
    .catch(() => {
      // Redis not available, will use in-memory fallback
    });
}

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

// Initialize Redis client if credentials are available
let redis: any = null;
let redisInitPromise: Promise<void> | null = null;

// Lazy initialize Redis after import completes
if (
  redisImportPromise &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redisInitPromise = redisImportPromise.then(() => {
    if (Redis) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
  });
}

/**
 * Create a rate limiter function with Redis backend for production.
 * Falls back to in-memory for development.
 */
function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, message = "Too many requests, please slow down." } = options;

  // Fallback in-memory store for development
  const memoryStore = new Map<string, WindowEntry>();

  return async function rateLimit(
    request: Request
  ): Promise<RateLimitResult & { message: string }> {
    // Ensure Redis is initialized if it's going to be used
    if (redisInitPromise) {
      await redisInitPromise;
    }

    // Extract client IP
    const forwarded = (request as { headers: Headers }).headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const key = `ratelimit:${ip}:${windowStart}`;

    let count: number;
    let resetAt = windowStart + windowMs;

    try {
      if (redis) {
        // Redis-backed rate limiting for production
        const pipeline = redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, Math.ceil(windowMs / 1000));
        const results = await pipeline.exec();
        count = results[0] as number;
      } else {
        // Fallback to in-memory for development
        const entry = memoryStore.get(key);

        if (!entry || now >= entry.resetAt) {
          count = 1;
          memoryStore.set(key, { count, resetAt });
        } else {
          count = entry.count + 1;
          memoryStore.set(key, { count, resetAt });
        }
      }
    } catch (error) {
      // If Redis fails, allow the request (fail open for availability)
      logger.warn({ error, ip }, "Rate limiter Redis error, allowing request");
      count = 1;
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
