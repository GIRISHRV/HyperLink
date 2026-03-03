"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SendError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Send route error caught:", error);
    }, [error]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-deep/50 border border-bauhaus-red/30 rounded-lg min-h-[400px] max-w-2xl mx-auto w-full mt-10">
            <div className="w-16 h-16 bg-bauhaus-red/10 border-2 border-bauhaus-red rounded-full flex items-center justify-center mb-6 text-bauhaus-red animate-pulse">
                <span className="material-symbols-outlined text-3xl">cloud_off</span>
            </div>

            <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-2 text-center">
                Transfer Uplink Failed
            </h2>
            <p className="text-sm font-mono text-gray-400 text-center mb-8 max-w-md">
                {error.message || "A fatal error occurred in the file transfer module."}
            </p>

            <Button onClick={() => reset()} variant="destructive">
                <span className="material-symbols-outlined mr-2">refresh</span>
                Restart Transfer Sequence
            </Button>
        </div>
    );
}
