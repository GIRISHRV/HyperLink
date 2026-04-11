import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@repo/utils";

/**
 * GET /api/keep-alive
 *
 * Dual keepalive endpoint — called by a Vercel cron job every 10 minutes.
 *
 * 1. Supabase: prevents the free-tier project from being paused (7-day window).
 * 2. Render signaling server: prevents the free-tier service from spinning down
 *    after 15 minutes of inactivity, which would cause a ~30 s cold-start that
 *    breaks WebRTC peer registration on the first connect.
 *
 * Both pings run in parallel. A degraded signaling ping returns 200 (warning)
 * so the cron job isn't marked as failed on a transient blip.
 *
 * Must NOT be cached — each invocation must actually hit the services.
 * Vercel Cron calls this with the CRON_SECRET bearer token.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const signalingUrl = process.env.RENDER_SIGNALING_URL;

  // ── Run both pings in parallel ────────────────────────────────────────────
  const [supabaseResult, signalingResult] = await Promise.allSettled([
    // 1. Supabase lightweight read
    (async () => {
      const supabase = await createClient();
      const { error } = await supabase.from("user_profiles").select("id").limit(1);
      if (error) throw new Error(error.message);
    })(),

    // 2. Render signaling server /health
    (async () => {
      if (!signalingUrl) throw new Error("RENDER_SIGNALING_URL not set — skipping");
      const res = await fetch(`${signalingUrl}/health`, {
        signal: AbortSignal.timeout(15_000), // 15 s hard timeout
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status !== "healthy") throw new Error(`Unexpected status: ${json.status}`);
    })(),
  ]);

  // ── Log outcomes ──────────────────────────────────────────────────────────
  const supabaseOk = supabaseResult.status === "fulfilled";
  const signalingOk = signalingResult.status === "fulfilled";

  if (supabaseOk) {
    logger.info({ timestamp }, "[keep-alive] ✅ Supabase pinged successfully");
  } else {
    logger.error(
      { error: (supabaseResult as PromiseRejectedResult).reason?.message },
      "[keep-alive] ❌ Supabase ping failed"
    );
  }

  if (signalingOk) {
    logger.info({ timestamp }, "[keep-alive] ✅ Render signaling server pinged successfully");
  } else {
    const reason = (signalingResult as PromiseRejectedResult).reason?.message;
    // Missing env var is expected in local dev — log as info, not error
    if (reason?.includes("not set")) {
      logger.info(
        { timestamp },
        "[keep-alive] ⚠️  Render ping skipped (RENDER_SIGNALING_URL not configured)"
      );
    } else {
      logger.error({ error: reason }, "[keep-alive] ❌ Render signaling server ping failed");
    }
  }

  // ── Return response ───────────────────────────────────────────────────────
  const overallStatus = supabaseOk ? (signalingOk ? "ok" : "degraded") : "error";
  const httpStatus = supabaseOk ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp,
      pings: {
        supabase: supabaseOk ? "ok" : "error",
        signaling: signalingOk ? "ok" : signalingUrl ? "error" : "skipped",
      },
    },
    { status: httpStatus, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
