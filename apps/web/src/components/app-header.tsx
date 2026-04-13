"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, getCurrentUser } from "@/lib/services/auth-service";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/services/profile-service";
import { AVATAR_COLOR_MAP, DEFAULT_AVATAR_COLOR, logger } from "@repo/utils";
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

export default function AppHeader({
  variant = "app",
  isPeerReady = false,
  status = "idle",
  onBackCheck,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [avatarIcon, setAvatarIcon] = useState("person");
  const [avatarColor, setAvatarColor] = useState(DEFAULT_AVATAR_COLOR);
  const [email, setEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (variant === "landing") {
      getCurrentUser()
        .then((user) => {
          if (user) setIsAuthenticated(true);
        })
        .catch((e) => logger.error({ e }, "Failed to check auth for landing"));
      return;
    }

    if (variant === "app") {
      getCurrentUser().then((user) => {
        if (!user) return;
        getUserProfile(user.id)
          .then((profile) => {
            if (profile) {
              if (profile.avatar_icon) setAvatarIcon(profile.avatar_icon);
              if (profile.avatar_color) {
                setAvatarColor(AVATAR_COLOR_MAP[profile.avatar_color] || DEFAULT_AVATAR_COLOR);
              }
            }
          })
          .catch((e) => logger.error({ e }, "Failed to load profile for header"));
      });
    }

    if (variant === "transfer") {
      getCurrentUser()
        .then((user) => {
          if (user?.email) setEmail(user.email);
        })
        .catch((e: unknown) => logger.error({ e }, "Failed to load user for transfer header"));
    }
  }, [variant]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [mobileMenuOpen]);

  async function handleSignOut() {
    await signOut();
    router.push("/auth");
  }

  const handleBack = () => {
    if (onBackCheck) {
      const canProceed = onBackCheck();
      if (!canProceed) return;
    }

    if (variant === "transfer" && !onBackCheck) {
      const isTransferActive =
        status === "connecting" ||
        status === "waiting" ||
        status === "transferring" ||
        status === "offering" ||
        status === "paused";
      // AUDIT FIX: Removed redundant confirm() - send/receive pages already have ConfirmLeaveModal
      if (isTransferActive) {
        // The custom modal in send/receive pages will handle the confirmation
        // This fallback was jarring and inconsistent with the app's design
        return;
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

  const Logo = () => (
    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
      <div className="size-8 bg-primary hover:bg-primary-hover flex items-center justify-center rounded-none text-black">
        <span className="material-symbols-outlined text-[24px]">link</span>
      </div>
      <h1 className="font-black text-xl tracking-wider text-white uppercase">HyperLink</h1>
    </Link>
  );

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

  const NetworkBadge = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`${mobile ? "flex" : "hidden md:flex"} items-center gap-2 ${mobile ? "" : "px-3 py-1.5"} bg-surface-elevated rounded-none border border-subtle`}
      role="status"
      aria-label={isOnline ? "Network status: Online" : "Network status: Offline"}
    >
      <div
        className={`size-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
      />
      <span className="text-xs font-mono text-gray-400">{isOnline ? "Online" : "Offline"}</span>
    </div>
  );

  // Peer ready badge — only rendered for the transfer variant
  const PeerBadge = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className="flex items-center gap-3 px-4 py-2 bg-surface border border-subtle"
      role="status"
      data-testid="peer-status-badge"
      aria-label={isPeerReady ? "System status: Ready" : "System status: Initializing"}
    >
      <div className="flex h-3 w-3 relative">
        <span
          className={`absolute inline-flex h-full w-full rounded-none opacity-75 ${isPeerReady ? "animate-ping bg-green-400" : "bg-red-400"}`}
        />
        <span
          className={`relative inline-flex rounded-none h-3 w-3 ${isPeerReady ? "bg-green-500" : "bg-red-500"}`}
        />
      </div>
      <span className="text-xs font-mono text-gray-400" data-testid="peer-status-text">
        {isPeerReady ? "System Ready" : "Initializing..."}
      </span>
      {email && !mobile && <span className="text-xs font-mono text-white ml-2">• {email}</span>}
    </div>
  );

  const links = variant === "app" ? appNavLinks : landingNavLinks;

  return (
    <>
      <header
        data-testid="app-header"
        data-header-variant={variant}
        className="relative z-20 sticky top-0 border-b border-subtle bg-surface/80 backdrop-blur-md"
      >
        {!isOnline && (
          <div className="absolute top-full left-0 w-full bg-red-500 text-white text-center text-xs font-bold uppercase tracking-widest py-1 animate-in slide-in-from-top-2 z-50">
            You are currently offline. Transfers may be interrupted.
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between w-full">
          <nav aria-label="Branding">
            <div className="flex items-center gap-3">
              <Logo />
            </div>
          </nav>

          <div className="flex items-center gap-4">
            {/* Nav links (app/landing) or peer status badge (transfer) */}
            {variant === "transfer" ? (
              <PeerBadge />
            ) : (
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
            )}

            <div className="flex items-center gap-3">
              {variant !== "transfer" && <NetworkBadge />}

              {variant === "app" && (
                <>
                  <button
                    onClick={() => {
                      // Dispatch custom event to trigger shortcuts modal
                      window.dispatchEvent(new CustomEvent("show-keyboard-shortcuts"));
                    }}
                    className="hidden md:flex items-center justify-center size-10 rounded-none bg-surface-elevated hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-subtle"
                    title="Keyboard Shortcuts (Ctrl+/)"
                  >
                    <span className="material-symbols-outlined text-[20px]">keyboard</span>
                  </button>
                  <div
                    className={`size-10 rounded-none ${avatarColor.value} flex items-center justify-center border border-subtle shadow-lg`}
                  >
                    <span className={`material-symbols-outlined text-xl ${avatarColor.text}`}>
                      {avatarIcon}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="hidden md:flex items-center justify-center size-10 rounded-none bg-surface-elevated hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-all border border-subtle"
                    title="Sign Out"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                  </button>
                </>
              )}

              {variant === "landing" && (
                <Link
                  href={isAuthenticated ? "/dashboard" : "/auth"}
                  className="hidden md:flex h-10 px-6 items-center justify-center bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider text-sm"
                >
                  {isAuthenticated ? "Dashboard" : "Login"}
                </Link>
              )}

              {variant === "transfer" && (
                <button
                  onClick={handleBack}
                  className="h-10 px-6 bg-surface-elevated hover:bg-surface-elevated/70 text-white text-sm font-bold uppercase tracking-wide transition-colors relative overflow-hidden hidden md:flex items-center border border-subtle"
                  aria-label="Back to Dashboard"
                >
                  <span className="relative z-10">← Dashboard</span>
                  <Ripple />
                </button>
              )}

              <MobileMenuToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav className="relative ml-auto w-72 max-w-[80vw] bg-surface border-l border-subtle flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-subtle">
              <span className="font-black text-lg tracking-wider text-white uppercase">
                {variant === "transfer" ? "Transfer" : "Menu"}
              </span>
              <button
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="size-10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {variant === "transfer" ? (
              <>
                <div className="p-6 border-b border-subtle flex flex-col gap-4">
                  <PeerBadge mobile={true} />
                  {email && (
                    <div className="text-xs font-mono text-white opacity-50 break-all">{email}</div>
                  )}
                </div>
                <div className="p-6 mt-auto">
                  <button
                    onClick={handleBack}
                    className="w-full h-12 bg-surface-elevated hover:bg-red-900/30 text-white transition-all border border-subtle text-sm font-bold uppercase tracking-wider flex items-center justify-center"
                  >
                    ← Dashboard
                  </button>
                </div>
              </>
            ) : (
              <>
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

                  {variant === "app" && (
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("show-keyboard-shortcuts"));
                        setMobileMenuOpen(false); // Close mobile menu
                      }}
                      className="w-full h-12 bg-surface-elevated text-gray-400 hover:text-white transition-all border border-subtle text-sm font-bold uppercase flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">keyboard</span>{" "}
                      Shortcuts
                    </button>
                  )}

                  {variant === "app" ? (
                    <button
                      onClick={handleSignOut}
                      className="w-full h-12 bg-surface-elevated text-gray-400 transition-all border border-subtle text-sm font-bold uppercase flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
                    </button>
                  ) : (
                    <Link
                      href={isAuthenticated ? "/dashboard" : "/auth"}
                      className="w-full h-12 bg-primary text-black font-bold uppercase tracking-wider flex items-center justify-center text-sm"
                    >
                      {isAuthenticated ? "Dashboard" : "Login / Signup"}
                    </Link>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
