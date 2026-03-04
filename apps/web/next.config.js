import withPWAInit from "@ducanh2912/next-pwa";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  customWorkerSrc: "worker",
  disable: false,
});

// Build peer server origin for CSP connect-src from env vars
const peerHost = process.env.NEXT_PUBLIC_PEER_SERVER_HOST || "localhost";
const peerPort = process.env.NEXT_PUBLIC_PEER_SERVER_PORT || "9000";
const isLocalPeer = peerHost === "localhost" || peerHost === "127.0.0.1";
const peerConnectSrc = isLocalPeer
  ? `http://${peerHost}:${peerPort} ws://${peerHost}:${peerPort}`
  : `https://${peerHost} wss://${peerHost}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // WebRTC peer connections require these polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  experimental: {
    instrumentationHook: true,
  },
  async rewrites() {
    return [
      {
        source: "/monitoring",
        destination: "https://o4510865897619456.ingest.de.sentry.io/api/4510865899716688/envelope/",
      },
    ];
  },
  // SEC-006: Security headers — CSP, framing protection, MIME sniffing prevention
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "media-src 'self' blob:",
              `connect-src 'self' ${peerConnectSrc} https://*.supabase.co wss://*.supabase.co https://*.sentry.io`,
              "worker-src 'self' blob:",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(
  withBundleAnalyzer(withPWA(nextConfig)),
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during bundling
    silent: true,
    org: process.env.SENTRY_ORG || "hyperlink-p2p",
    project: process.env.SENTRY_PROJECT || "web-app",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#use-hidden-source-map-for-client-side-queries

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    // FINDING-044: Removed transpileClientSDK: true

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
