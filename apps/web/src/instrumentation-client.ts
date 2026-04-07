import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tunnel: "/monitoring",
  enabled: process.env.NEXT_PUBLIC_DISABLE_SENTRY !== "true",

  // Drastically reduce sampling for free tier
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 0.1, // 1% in prod, 10% in dev

  debug: false,

  // Disable expensive features for free tier
  replaysOnErrorSampleRate: 0.1, // Only 10% of errors get replays
  replaysSessionSampleRate: 0.01, // Only 1% of sessions recorded

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Add error filtering to reduce noise
  beforeSend(event) {
    // Filter out common non-critical errors
    if (event.exception) {
      const error = event.exception.values?.[0];

      // ChunkLoadError often indicates stale deployment - log locally but don't send to Sentry
      if (error?.type === "ChunkLoadError") {
        console.warn(
          "[Deployment] ChunkLoadError detected - user may have stale chunks from previous deployment",
          {
            type: error.type,
            value: error.value,
          }
        );
        return null;
      }

      if (
        error?.type === "ResizeObserver loop limit exceeded" ||
        error?.value?.includes("Non-Error promise rejection")
      ) {
        return null; // Don't send to Sentry
      }
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
