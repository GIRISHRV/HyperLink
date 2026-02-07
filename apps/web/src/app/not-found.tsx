"use client";

import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Geometric Shapes */}
            <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-bauhaus-blue opacity-20 blur-xl animate-pulse" />
            <div className="absolute bottom-32 right-20 w-40 h-40 bg-bauhaus-red opacity-10 rotate-45" />
            <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-primary opacity-10 -rotate-12" />

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl text-center">
                {/* 404 Typography */}
                <div className="relative">
                    <h1 className="text-[12rem] md:text-[16rem] font-black tracking-tighter leading-none">
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-bauhaus-blue via-primary to-bauhaus-red">
                            404
                        </span>
                    </h1>
                    <div className="absolute inset-0 text-[12rem] md:text-[16rem] font-black tracking-tighter leading-none opacity-20 blur-sm">
                        404
                    </div>
                </div>

                {/* Error Message */}
                <div className="flex flex-col gap-4 items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-1 w-12 bg-bauhaus-red" />
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                            Route Not Found
                        </span>
                        <div className="h-1 w-12 bg-bauhaus-red" />
                    </div>

                    <p className="text-xl md:text-2xl font-medium text-gray-400 max-w-md">
                        The coordinates you entered don&apos;t exist in our{" "}
                        <span className="text-primary font-bold">hyperspace</span>.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                    <Link href="/">
                        <button className="w-full sm:w-auto h-14 px-8 bg-primary hover:bg-[#ffea2e] text-black font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">home</span>
                            Go Home
                        </button>
                    </Link>

                    <Link href="/dashboard">
                        <button className="w-full sm:w-auto h-14 px-8 bg-transparent border-2 border-white/20 hover:border-primary hover:bg-primary/10 text-white font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">dashboard</span>
                            Dashboard
                        </button>
                    </Link>
                </div>

                {/* Technical Info */}
                <div className="mt-8 font-mono text-xs text-gray-600 uppercase tracking-wider">
                    ERROR_CODE: HTTP_404 // PAGE_NOT_FOUND
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
