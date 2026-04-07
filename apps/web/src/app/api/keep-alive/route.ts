import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@repo/utils";

/**
 * GET /api/keep-alive
 *
 * Supabase pause-prevention endpoint.
 * Called by a Vercel cron job every 3 days to keep the free-tier
 * Supabase project from being paused due to inactivity (7-day window).
 *
 * Must NOT be cached — each invocation must actually hit the database.
 * Vercel Cron calls this with the CRON_SECRET bearer token.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const supabase = await createClient();

    // Lightweight read — just check 1 row from user_profiles.
    // Any table works; this avoids touching sensitive transfer data.
    const { error } = await supabase.from("user_profiles").select("id").limit(1);

    if (error) {
      logger.error({ error }, "[keep-alive] Supabase query failed");
      return NextResponse.json(
        { status: "error", message: error.message, timestamp },
        {
          status: 503,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }

    logger.info({ timestamp }, "[keep-alive] ✅ Supabase pinged successfully");

    return NextResponse.json(
      { status: "ok", message: "Supabase keep-alive ping successful", timestamp },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (err) {
    logger.error({ err }, "[keep-alive] Unexpected error");
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
        timestamp,
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
}
