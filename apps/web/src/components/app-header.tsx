"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, getCurrentUser } from "@/lib/services/auth-service";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/services/profile-service";
import { AVATAR_COLOR_MAP, DEFAULT_AVATAR_COLOR } from "@repo/utils";
import { Ripple } from "@/components/ripple";

type HeaderVariant = "landing" | "app" | "transfer";

interface AppHeaderProps {
    variant?: HeaderVariant;
    /** For "transfer" variant */
    isPeerReady?: boolean;
    /** For "transfer" variant */
    status?: string;
    /** Allows transfer component to intercept the Back action */
    onBackCheck?: () => boolean;
}

export default function AppHeader({ variant = "app", isPeerReady = false, status = "idle", onBackCheck }: AppHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();

    // User Profile State (only fetched if variant="app" or "transfer")
    const [avatarIcon, setAvatarIcon] = useState("person");
    const [avatarColor, setAvatarColor] = useState(DEFAULT_AVATAR_COLOR);
    const [email, setEmail] = useState<string>("");
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // UI State
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    // Fetch user profile data based on variant
    useEffect(() => {
        if (variant === "landing") {
            getCurrentUser().then(user => {
                if (user) setIsAuthenticated(true);
            }).catch(e => console.error("Failed to check auth for landing", e));
            return;
        }

        if (variant === "app") {
            getCurrentUser().then(user => {
                if (!user) return;
                getUserProfile(user.id).then(profile => {
                    if (profile) {
                        if (profile.avatar_icon) setAvatarIcon(profile.avatar_icon);
                        if (profile.avatar_color) {
                            setAvatarColor(AVATAR_COLOR_MAP[profile.avatar_color] || DEFAULT_AVATAR_COLOR);
                        }
                    }
                }).catch(e => console.error("Failed to load profile for header", e));
            });
        }

        if (variant === "transfer") {
            getCurrentUser().then(user => {
                if (user?.email) setEmail(user.email);
            });
        }
    }, [variant]);

    // Network Status
    useEffect(() => {
        if (typeof navigator !== "undefined") {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    async function handleSignOut() {
        await signOut();
        router.push("/auth");
    }

    const handleBack = () => {
        if (onBackCheck) {
            const canProceed = onBackCheck();
            if (!canProceed) return;
        }

        // Default transfer interception check
        if (variant === "transfer") {
            const isTransferActive = status === "connecting" || status === "waiting" || status === "transferring" || status === "offering" || status === "paused";
            if (isTransferActive && !onBackCheck) {
                if (!confirm("Transfer in progress. Are you sure you want to leave? This will cancel the transfer.")) {
                    return;
                }
            }
        }

        router.push("/dashboard");
    };

    const isActive = (path: string) => pathname === path;

    const appNavLinks = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/history", label: "History" },
        { href: "/settings", label: "Settings" },
    ];

    const landingNavLinks = [
        { href: "/about", label: "How it Works" },
        { href: "/status", label: "Status" },
    ];

    // --- RENDER PARTS ---

    // The core branding logo component
    const Logo = ({ padded = false }: { padded?: boolean }) => (
        <Link href="/" className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${padded ? 'px-8 py-6' : ''}`}>
            {variant !== "transfer" ? (
                // Standard Icon Logo
                <>
                    <div className="size-8 bg-primary hover:bg-primary-hover flex items-center justify-center rounded-none text-black">
                        <span className="material-symbols-outlined text-[24px]">link</span>
                    </div>
                    <h1 className="font-black text-xl tracking-wider text-white uppercase">HyperLink</h1>
                </>
            ) : (
                // Massive Typography Logo for Transfer pages
                <div className="flex bg-primary text-background-dark h-full items-center justify-center min-w-[200px] hover:bg-primary-hover transition-colors">
                    <span className="font-black text-4xl tracking-tighter uppercase px-8">HYPER</span>
                </div>
            )}
        </Link>
    );

    // Common mobile menu toggle button
    const MobileMenuToggle = () => (
        <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center size-10 rounded-none bg-surface-elevated text-gray-400 hover:text-white transition-all border border-subtle"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
        >
            <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? "close" : "menu"}
            </span>
        </button>
    );

    // Network badge
    const NetworkBadge = ({ mobile = false }: { mobile?: boolean }) => (
        <div className={`${mobile ? 'flex' : 'hidden md:flex'} items-center gap-2 ${mobile ? '' : 'px-3 py-1.5'} bg-surface-elevated rounded-none border border-subtle`} role="status" aria-label={isOnline ? "Network status: Online" : "Network status: Offline"}>
            <div className={`size-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs font-mono text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
    );

    // --- VARIANT LOGIC ---

    if (variant === "transfer") {
        return (
            <>
                <nav className="w-full flex flex-col md:flex-row border-b border-subtle">
                    {/* Left: Logo Block */}
                    <Logo padded={true} />
                    {/* Right: Navigation */}
                    <div className="flex-1 bg-white dark:bg-background-dark flex items-center justify-between px-8 py-4 md:py-0 border-t md:border-t-0 border-subtle">
                        <Link href="/" className="font-black text-4xl tracking-tighter uppercase text-background-dark dark:text-white hover:opacity-80 transition-opacity">LINK</Link>
                        <div className="flex gap-4 md:gap-8 items-center">
                            {/* Peer Status */}
                            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-surface border border-subtle">
                                <div className="flex h-3 w-3 relative">
                                    <span className={`absolute inline-flex h-full w-full rounded-none opacity-75 ${isPeerReady ? 'animate-ping bg-green-400' : 'bg-red-400'}`}></span>
                                    <span className={`relative inline-flex rounded-none h-3 w-3 ${isPeerReady ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                </div>
                                <span className="text-xs font-mono text-gray-400">{isPeerReady ? "System Ready" : "Initializing..."}</span>
                                {email && <span className="text-xs font-mono text-white ml-2">• {email}</span>}
                            </div>

                            {/* Back Button */}
                            <button
                                onClick={handleBack}
                                className="h-12 px-6 bg-surface-elevated hover:bg-surface-elevated/70 text-white text-sm font-bold uppercase tracking-wide transition-colors relative overflow-hidden hidden md:block border border-subtle"
                                aria-label="Back to Dashboard"
                            >
                                <span className="relative z-10">← Dashboard</span>
                                <Ripple />
                            </button>

                            <MobileMenuToggle />
                        </div>
                    </div>
                </nav>

                {/* Simplified Slide-out Menu for Transfer */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-50 flex">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                        <nav className="relative ml-auto w-72 max-w-[80vw] bg-surface border-l border-subtle flex flex-col animate-in slide-in-from-right duration-200">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-subtle">
                                <span className="font-black text-lg tracking-wider text-white uppercase">Transfer</span>
                                <button aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="size-10 flex items-center justify-center text-gray-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                            </div>

                            <div className="p-6 border-b border-subtle">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`size-3 ${isPeerReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-xs font-mono text-gray-400">{isPeerReady ? "System Ready" : "Initializing..."}</span>
                                </div>
                                {email && <div className="text-xs font-mono text-white opacity-50 break-all mb-4">{email}</div>}
                                <NetworkBadge mobile={true} />
                            </div>

                            <div className="p-6 mt-auto">
                                <button
                                    onClick={handleBack}
                                    className="w-full h-12 bg-surface-elevated hover:bg-red-900/30 text-white transition-all border border-subtle text-sm font-bold uppercase tracking-wider flex items-center justify-center"
                                >
                                    ← Dashboard
                                </button>
                            </div>
                        </nav>
                    </div>
                )}
            </>
        );
    }

    // Landing & App Variants
    const links = variant === "app" ? appNavLinks : landingNavLinks;

    return (
        <>
            <header className="relative z-20 flex items-center justify-between px-6 py-5 border-b border-subtle bg-surface/80 backdrop-blur-md sticky top-0">
                {!isOnline && (
                    <div className="absolute top-full left-0 w-full bg-red-500 text-white text-center text-xs font-bold uppercase tracking-widest py-1 animate-in slide-in-from-top-2 z-50">
                        You are currently offline. Transfers may be interrupted.
                    </div>
                )}

                <Logo />

                <div className="flex items-center gap-4">
                    <nav className="hidden md:flex items-center gap-1 mr-4">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 rounded-none text-sm font-bold uppercase tracking-wider transition-all ${isActive(link.href) ? "text-primary bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        <NetworkBadge />

                        {variant === "app" ? (
                            <>
                                <div className={`size-10 rounded-none ${avatarColor.value} flex items-center justify-center border border-subtle shadow-lg`}>
                                    <span className={`material-symbols-outlined text-xl ${avatarColor.text}`}>{avatarIcon}</span>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="hidden md:flex items-center justify-center size-10 rounded-none bg-surface-elevated hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-all border border-subtle"
                                    title="Sign Out"
                                >
                                    <span className="material-symbols-outlined text-[20px]">logout</span>
                                </button>
                            </>
                        ) : (
                            <Link href={isAuthenticated ? "/dashboard" : "/auth"} className="hidden md:flex h-10 px-6 items-center justify-center bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider text-sm">
                                {isAuthenticated ? "Dashboard" : "Login"}
                            </Link>
                        )}

                        <MobileMenuToggle />
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                    <nav className="relative ml-auto w-72 max-w-[80vw] bg-surface border-l border-subtle flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-subtle">
                            <span className="font-black text-lg tracking-wider text-white uppercase">Menu</span>
                            <button aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="size-10 flex items-center justify-center text-gray-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="flex flex-col py-4">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all border-l-4 ${isActive(link.href) ? "text-primary bg-white/5 border-primary" : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"}`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>

                        <div className="mt-auto border-t border-subtle p-6 flex flex-col gap-4">
                            <NetworkBadge mobile={true} />

                            {variant === "app" ? (
                                <button
                                    onClick={handleSignOut}
                                    className="w-full h-12 bg-surface-elevated text-gray-400 transition-all border border-subtle text-sm font-bold uppercase flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
                                </button>
                            ) : (
                                <Link href={isAuthenticated ? "/dashboard" : "/auth"} className="w-full h-12 bg-primary text-black font-bold uppercase tracking-wider flex items-center justify-center text-sm">
                                    {isAuthenticated ? "Dashboard" : "Login / Signup"}
                                </Link>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </>
    );
}
