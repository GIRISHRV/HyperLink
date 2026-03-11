import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { turnCredentialsLimiter } from "@/lib/middleware/rate-limit";

/**
 * FINDING-015: TURN credentials served server-side so they never ship in the
 * client bundle. Only authenticated users receive credentials.
 *
 * SEC-013: Rate limited to 10 requests/min per IP to prevent DoS.
 */
export async function GET(request: Request) {
  // Rate limiting — applied before auth to reduce load on Supabase
  const { limited, headers, message } = turnCredentialsLimiter(request);
  if (limited) {
    return NextResponse.json({ error: message }, { status: 429, headers });
  }

  // Restrict TURN credentials to authenticated users to prevent anonymous abuse.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });

  const iceServers: RTCIceServer[] = [
    // Always include at least one STUN server (reduced from 2)
    { urls: "stun:stun.l.google.com:19302" },
  ];

  // Task #4: Support multiple TURN providers for redundancy
  const turnProviders = [
    {
      url: process.env.TURN_URL,
      user: process.env.TURN_USERNAME,
      pass: process.env.TURN_CREDENTIAL,
    },
    {
      url: process.env.TURN_URL_2,
      user: process.env.TURN_USERNAME_2,
      pass: process.env.TURN_CREDENTIAL_2,
    },
  ].filter((p) => p.url);

  if (turnProviders.length > 0) {
    // Use private/paid TURN providers if configured
    turnProviders.forEach((p) => {
      iceServers.push({
        urls: p.url!,
        username: p.user ?? "",
        credential: p.pass ?? "",
      });
    });
  } else {
    // Public OpenRelay fallback — reduced to 3 total (1 STUN + 3 TURN)
    // or 4 total to stay under 5. Let's keep 4.
    iceServers.push(
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      }
    );
  }

  return NextResponse.json(
    { iceServers },
    {
      headers: {
        // Cache for 1 minute — TURN credentials are static; short TTL
        // allows quick rotation without hard-coded expiry.
        "Cache-Control": "private, max-age=60",
        ...headers,
      },
    }
  );
}
