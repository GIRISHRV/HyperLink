"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/services/auth-service";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/services/profile-service";
import { Ripple } from "@/components/ripple";

export default function GlobalHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [avatarIcon, setAvatarIcon] = useState("person");
    const [avatarColor, setAvatarColor] = useState({ value: "bg-primary", text: "text-black" });

    useEffect(() => {
        async function loadProfile() {
            try {
                const profile = await getUserProfile();
                if (profile) {
                    if (profile.avatar_icon) setAvatarIcon(profile.avatar_icon);

                    const colorMap: Record<string, { value: string; text: string }> = {
                        "bg-primary": { value: "bg-primary", text: "text-black" },
                        "bg-bauhaus-blue": { value: "bg-bauhaus-blue", text: "text-white" },
                        "bg-bauhaus-red": { value: "bg-bauhaus-red", text: "text-white" },
                        "bg-green-500": { value: "bg-green-500", text: "text-white" },
                        "bg-purple-500": { value: "bg-purple-500", text: "text-white" },
                        "bg-orange-500": { value: "bg-orange-500", text: "text-black" },
                    };
                    if (profile.avatar_color) {
                        setAvatarColor(colorMap[profile.avatar_color] || colorMap["bg-primary"]);
                    }
                }
            } catch (e) {
                console.error("Failed to load profile for header", e);
            }
        }
        loadProfile();
    }, []);

    async function handleSignOut() {
        await signOut();
        router.push("/auth");
    }

    const isActive = (path: string) => pathname === path;

    // Network Status
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <header className="relative z-20 flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#1a1a1a]/80 backdrop-blur-md sticky top-0">
            {/* Offline Banner */}
            {!isOnline && (
                <div className="absolute top-full left-0 w-full bg-red-500 text-white text-center text-xs font-bold uppercase tracking-widest py-1 animate-in slide-in-from-top-2">
                    You are currently offline. Transfers may be interrupted.
                </div>
            )}

            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="size-8 bg-primary flex items-center justify-center rounded-sm text-black">
                    <span className="material-symbols-outlined text-[24px]">link</span>
                </div>
                <h1 className="font-black text-xl tracking-wider text-white uppercase">HyperLink</h1>
            </Link>

            <div className="flex items-center gap-4">
                {/* Navigation Links (Hidden on small screens) */}
                <nav className="hidden md:flex items-center gap-1 mr-4">
                    <Link
                        href="/dashboard"
                        className={`px-4 py-2 rounded-sm text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden ${isActive("/dashboard") ? "text-primary bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <span className="relative z-10">Dashboard</span>
                        {isActive("/dashboard") && <Ripple color="rgba(255, 234, 46, 0.1)" />}
                    </Link>
                    <Link
                        href="/history"
                        className={`px-4 py-2 rounded-sm text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden ${isActive("/history") ? "text-primary bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <span className="relative z-10">History</span>
                        {isActive("/history") && <Ripple color="rgba(255, 234, 46, 0.1)" />}
                    </Link>
                    <Link
                        href="/settings"
                        className={`px-4 py-2 rounded-sm text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden ${isActive("/settings") ? "text-primary bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <span className="relative z-10">Settings</span>
                        {isActive("/settings") && <Ripple color="rgba(255, 234, 46, 0.1)" />}
                    </Link>
                </nav>

                {/* User Profile / Status */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#242424] rounded-sm border border-white/5">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-mono text-gray-400">Online</span>
                    </div>

                    <div className={`size-10 rounded-full ${avatarColor.value} flex items-center justify-center border border-white/10 shadow-lg`}>
                        <span className={`material-symbols-outlined text-xl ${avatarColor.text}`}>
                            {avatarIcon}
                        </span>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="flex items-center justify-center size-10 rounded-sm bg-[#242424] hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-all border border-white/5 relative overflow-hidden"
                        title="Sign Out"
                        aria-label="Sign Out"
                    >
                        <span className="material-symbols-outlined text-[20px] relative z-10">logout</span>
                        <Ripple color="rgba(239, 68, 68, 0.2)" />
                    </button>
                </div>
            </div>
        </header>
    );
}
