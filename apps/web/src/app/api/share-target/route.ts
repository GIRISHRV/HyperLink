import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    // FINDING-019: Validate Origin/CSRF and limit payload size to prevent DoS
    // on the Next.js process if the Service Worker fails to intercept.

    // 1. Origin check (if provided by browser)
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).hostname !== new URL(req.url).hostname) {
        return new NextResponse("Invalid Origin", { status: 403 });
    }

    // 2. Payload size check (prevent memory exhaustion)
    // Limits the fallback route to 100MB since data shouldn't be routed here anyway.
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 104857600) {
        return new NextResponse("Payload Too Large", { status: 413 });
    }

    // If the request reaches here safely, the Service Worker failed to intercept it.
    // Redirect to send page with fallback flag.
    return NextResponse.redirect(new URL("/send?shared=failed_sw_bypass", req.url), 303);
}
