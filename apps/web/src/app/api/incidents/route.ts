import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { incidentsLimiter } from "@/lib/middleware/rate-limit";
import { logger } from "@repo/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // SEC-013: Rate limit before hitting the database
  const { limited, headers, message } = await incidentsLimiter(request);
  if (limited) {
    return NextResponse.json({ error: message }, { status: 429, headers });
  }

  try {
    const supabase = await createClient();

    // Fetch last 10 incidents, ordered by most recent
    const { data: incidents, error } = await supabase
      .from("incidents")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10);

    if (error) {
      logger.error({ error }, "[API] Error fetching incidents");
      return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500, headers });
    }

    return NextResponse.json({ incidents: incidents || [] }, { headers });
  } catch (error) {
    logger.error({ error }, "[API] Unexpected error in incidents route");
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
