import { NextResponse } from "next/server";

/**
 * FINDING-029: Health check endpoint for the web application.
 * Allows load balancers, uptime monitors, and Kubernetes readiness probes
 * to verify the app is running without touching any external services.
 */
export async function GET() {
    return NextResponse.json(
        {
            status: "ok",
            service: "HyperLink Web",
            timestamp: new Date().toISOString(),
        },
        { status: 200 }
    );
}
