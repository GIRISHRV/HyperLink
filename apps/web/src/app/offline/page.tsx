"use client";

import Link from "next/link";
import { Ripple } from "@/components/ripple";

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0a] text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full"></div>
            </div>

            <main className="relative z-10 max-w-lg w-full text-center">
                {/* Logo */}
                <div className="flex justify-center mb-12">
                    <div className="flex items-center gap-3">
                        <div className="size-12 bg-primary flex items-center justify-center rounded-sm text-black shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
                            <span className="material-symbols-outlined text-[32px]">link</span>
                        </div>
                        <h1 className="font-black text-3xl tracking-tighter text-white uppercase italic">HyperLink</h1>
                    </div>
                </div>

                {/* Illustration / Icon */}
                <div className="mb-10 relative">
                    <div className="size-32 mx-auto bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/5 relative z-10">
                        <span className="material-symbols-outlined text-5xl text-gray-500 animate-pulse">signal_wifi_off</span>
                    </div>
                    {/* Ring decoration */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 border border-primary/10 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                </div>

                <h2 className="text-4xl font-black uppercase tracking-tight mb-4">Signal Lost</h2>
                <p className="text-gray-400 font-medium mb-12 leading-relaxed">
                    HyperLink requires an active uplink to discover peers and sync data.
                    Please check your network connection and try again.
                </p>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full h-16 bg-primary hover:bg-[#ffea2e] text-black text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] relative overflow-hidden flex items-center justify-center gap-3 group shadow-[0_0_40px_-10px_rgba(var(--primary-rgb),0.5)]"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px] font-bold group-hover:rotate-180 transition-transform duration-500">refresh</span>
                            Retry Connection
                        </span>
                        <Ripple color="rgba(0,0,0,0.2)" />
                    </button>

                    <Link
                        href="/history"
                        className="w-full h-14 bg-[#1a1a1a] border border-white/10 hover:border-white/30 text-white text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] relative overflow-hidden flex items-center justify-center gap-3"
                    >
                        <span className="relative z-10 flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[18px]">history</span>
                            View History (Offline Ready)
                        </span>
                        <Ripple />
                    </Link>
                </div>

                <p className="mt-12 text-[10px] font-mono text-gray-600 uppercase tracking-[.3em]">
                    V2.0.0-NATIVE • UNTETHERED MODE
                </p>
            </main>
        </div>
    );
}
