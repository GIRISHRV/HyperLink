import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    // If the request reaches here, it means the Service Worker FAILED to intercept it.
    // This is a fallback to prevent a 404 error.

    // Since we cannot easily process the FormData files on the server and pass them to the client
    // (P2P implies we don't want to upload to server storage),
    // we will simply redirect the user to the Send page with a specific error/status.

    return NextResponse.redirect(new URL("/send?shared=failed_sw_bypass", req.url), 303);
}
