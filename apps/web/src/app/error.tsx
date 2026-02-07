"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Geometric Shapes */}
            <div className="absolute top-20 right-10 w-32 h-32 rounded-full bg-bauhaus-red opacity-20 blur-xl animate-pulse" />
            <div className="absolute bottom-32 left-20 w-40 h-40 bg-primary opacity-10 rotate-12" />

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl text-center">
                {/* Error Icon */}
                <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-bauhaus-red/20 flex items-center justify-center border-4 border-bauhaus-red/30">
                        <span className="material-symbols-outlined text-7xl text-bauhaus-red">
                            warning
                        </span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full animate-ping" />
                </div>

                {/* Error Message */}
                <div className="flex flex-col gap-4 items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-1 w-12 bg-bauhaus-red" />
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                            System Error
                        </span>
                        <div className="h-1 w-12 bg-bauhaus-red" />
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                        Something Went <span className="text-bauhaus-red">Wrong</span>
                    </h1>

                    <p className="text-lg md:text-xl font-medium text-gray-400 max-w-md">
                        An unexpected error occurred. Our systems have been notified and we&apos;re working on a fix.
                    </p>
                </div>

                {/* Error Details (Dev Mode) */}
                {process.env.NODE_ENV === "development" && error.message && (
                    <div className="w-full bg-[#1a1a1a] border border-bauhaus-red/30 p-4 rounded font-mono text-xs text-left overflow-auto max-w-xl">
                        <p className="text-bauhaus-red font-bold mb-2 uppercase tracking-wider">
                            Debug Info (Dev Mode):
                        </p>
                        <p className="text-gray-400 break-all">{error.message}</p>
                        {error.digest && (
                            <p className="text-gray-600 mt-2">Digest: {error.digest}</p>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                    <button
                        onClick={reset}
                        className="w-full sm:w-auto h-14 px-8 bg-primary hover:bg-[#ffea2e] text-black font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        Try Again
                    </button>

                    <Link href="/">
                        <button className="w-full sm:w-auto h-14 px-8 bg-transparent border-2 border-white/20 hover:border-primary hover:bg-primary/10 text-white font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">home</span>
                            Go Home
                        </button>
                    </Link>
                </div>

                {/* Technical Info */}
                <div className="mt-8 font-mono text-xs text-gray-600 uppercase tracking-wider">
                    ERROR_CODE: HTTP_500 // INTERNAL_SERVER_ERROR
                </div>
            </div>

            {/* Tri-Color Footer Strip */}
            <div className="absolute bottom-0 left-0 right-0 flex h-2">
                <div className="flex-1 bg-bauhaus-blue" />
                <div className="flex-1 bg-bauhaus-red" />
                <div className="flex-1 bg-primary" />
            </div>
        </div>
    );
}
