"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@repo/utils";

export default function ReceiveError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.error({ error }, "Receive route error caught:");
    }, [error]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-deep/50 border border-bauhaus-red/30 rounded-lg min-h-[400px] max-w-2xl mx-auto w-full mt-10">
            <div className="w-16 h-16 bg-bauhaus-red/10 border-2 border-bauhaus-red rounded-full flex items-center justify-center mb-6 text-bauhaus-red animate-pulse">
                <span className="material-symbols-outlined text-3xl">wifi_off</span>
            </div>

            <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-2 text-center">
                Connection Dropped
            </h2>
            <p className="text-sm font-mono text-gray-400 text-center mb-8 max-w-md">
                {error.message || "A fatal error occurred while trying to receive the file."}
            </p>

            <Button onClick={() => reset()} variant="destructive">
                <span className="material-symbols-outlined mr-2">refresh</span>
                Retry Connection
            </Button>
        </div>
    );
}
