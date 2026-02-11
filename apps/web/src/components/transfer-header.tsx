"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ripple } from "@/components/ripple";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/services/auth-service";

interface TransferHeaderProps {
    isPeerReady?: boolean;
    status?: string;
    onBackCheck?: () => boolean; // Return false to prevent navigation
}

export default function TransferHeader({ isPeerReady = false, status = "idle", onBackCheck }: TransferHeaderProps) {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");

    useEffect(() => {
        getCurrentUser().then(user => {
            if (user?.email) setEmail(user.email);
        });
    }, []);

    const handleBack = () => {
        if (onBackCheck) {
            const canProceed = onBackCheck();
            if (!canProceed) return;
        }

        // Default check if no callback provided but status implies activity
        const isTransferActive = status === "connecting" || status === "waiting" || status === "transferring" || status === "receiving" || status === "prompted";

        if (isTransferActive && !onBackCheck) {
            if (!confirm("Transfer in progress. Are you sure you want to leave? This will cancel the transfer.")) {
                return;
            }
        }

        router.push("/dashboard");
    };

    return (
        <nav className="w-full flex flex-col md:flex-row border-b border-[#333]">
            {/* Left: Logo Block */}
            <Link href="/" className="bg-primary text-[#121212] px-8 py-6 flex items-center justify-center md:justify-start min-w-[200px] hover:bg-primary/90 transition-colors">
                <span className="font-black text-4xl tracking-tighter uppercase">HYPER</span>
            </Link>
            {/* Right: Navigation & Secondary Logo Part */}
            <div className="flex-1 bg-white dark:bg-[#121212] flex items-center justify-between px-8 py-4 md:py-0">
                <Link href="/" className="font-black text-4xl tracking-tighter uppercase text-[#121212] dark:text-white hover:opacity-80 transition-opacity">LINK</Link>
                <div className="flex gap-4 md:gap-8 items-center">
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#1a1a1a] border border-[#333]">
                        <div className="flex h-3 w-3 relative">
                            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isPeerReady ? 'animate-ping bg-green-400' : 'bg-red-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${isPeerReady ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                        <span className="text-xs font-mono text-gray-400">{isPeerReady ? "System Ready" : "Initializing..."}</span>
                        {email && <span className="text-xs font-mono text-white ml-2">• {email}</span>}
                    </div>
                    <button
                        onClick={handleBack}
                        className="h-12 px-6 bg-[#333] hover:bg-[#555] text-white text-sm font-bold uppercase tracking-wide transition-colors relative overflow-hidden"
                        aria-label="Back to Dashboard"
                    >
                        <span className="relative z-10">← Dashboard</span>
                        <Ripple />
                    </button>
                </div>
            </div>
        </nav>
    );
}
