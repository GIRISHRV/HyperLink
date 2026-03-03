"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * FINDING-041: Route-level Error Boundary for the Dashboard quadrant.
 * Prevents a crash here from bringing down the entire App shell.
 */
export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard error boundary caught:", error);
    }, [error]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-deep/50 border border-bauhaus-red/30 rounded-lg min-h-[400px]">
            <div className="w-16 h-16 bg-bauhaus-red/10 border-2 border-bauhaus-red rounded-full flex items-center justify-center mb-6 text-bauhaus-red">
                <span className="material-symbols-outlined text-3xl">error</span>
            </div>

            <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-2">
                Dashboard Fault
            </h2>
            <p className="text-sm font-mono text-gray-400 text-center mb-8 max-w-md">
                {error.message || "Failed to load dashboard data. The secure link remains active."}
            </p>

            <Button onClick={() => reset()} variant="destructive">
                <span className="material-symbols-outlined mr-2">refresh</span>
                Retry Module
            </Button>
        </div>
    );
}
