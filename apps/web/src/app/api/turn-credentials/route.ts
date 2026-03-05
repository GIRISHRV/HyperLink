import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * FINDING-015: TURN credentials served server-side so they never ship in the
 * client bundle. Only authenticated users receive credentials.
 *
 * To use a paid provider (Twilio, Metered.ca, etc.) set:
 *   TURN_URL, TURN_USERNAME, TURN_CREDENTIAL
 * on the server (not NEXT_PUBLIC_*). When absent, falls back to the public
 * OpenRelay servers — same as before, but now served from the server, not
 * baked into the bundle.
 */
export async function GET() {
    // Restrict TURN credentials to authenticated users to prevent anonymous abuse.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const iceServers: RTCIceServer[] = [
        // Always include at least two STUN servers
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ];

    if (process.env.TURN_URL) {
        // Paid / private TURN — credentials live only on the server
        iceServers.push({
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME ?? "",
            credential: process.env.TURN_CREDENTIAL ?? "",
        });
    } else {
        // Public OpenRelay fallback — free, rate-limited, fine for development
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
            },
        }
    );
}
