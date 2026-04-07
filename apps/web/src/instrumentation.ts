import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Note: tracesSampleRate is set to 1% in production to stay within free tier limits.
      // Consider increasing to 5-10% with a custom tracesSampler that always samples
      // transfer-related transactions if debugging intermittent transfer failures.
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 0.1,
      debug: false,
      enabled: process.env.NEXT_PUBLIC_DISABLE_SENTRY !== "true",
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 0.1,
      debug: false,
      enabled: process.env.NEXT_PUBLIC_DISABLE_SENTRY !== "true",
    });
  }
}

// Allowlist of safe headers to send to Sentry (excludes sensitive headers like Authorization, Cookie)
const SAFE_HEADERS = [
  "user-agent",
  "content-type",
  "accept",
  "accept-language",
  "accept-encoding",
  "referer",
  "origin",
  "content-length",
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-real-ip",
];

// Add the missing onRequestError hook for Sentry
export async function onRequestError(
  err: unknown,
  request: Request,
  context: { routerKind: string; routerType: string; route: string }
) {
  // Filter headers to only include safe ones
  const safeHeaders: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    if (SAFE_HEADERS.includes(key.toLowerCase())) {
      safeHeaders[key] = value;
    }
  }

  Sentry.captureException(err, {
    tags: {
      route: context.route,
      routerKind: context.routerKind,
      routerType: context.routerType,
    },
    extra: {
      request: {
        url: request.url,
        method: request.method,
        headers: safeHeaders,
      },
    },
  });
}
