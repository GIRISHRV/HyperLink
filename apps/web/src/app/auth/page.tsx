"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/app-header";
import { signIn, signUp, signInWithMagicLink, resetPassword } from "@/lib/services/auth-service";
import { getSafeRedirect } from "@/lib/utils/auth-redirect";
import { logger } from "@repo/utils";

const MIN_PASSWORD_LENGTH = 8;
const MAX_FAILED_ATTEMPTS = 5;

/** SEC-005: Normalize Supabase error messages to prevent user enumeration */
function normalizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email may already exist.";
  }
  return "Authentication failed. Please try again.";
}


export default function AuthPage() {
  const router = useRouter();

  /** Always read from live URL — useSearchParams() can be empty during SSR hydration */
  const getRedirect = () =>
    getSafeRedirect(new URLSearchParams(window.location.search).get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // SEC-004: Client-side rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { getCurrentUser } = await import("@/lib/services/auth-service");
      const user = await getCurrentUser();

      // Artificial slight delay for smoother skeleton feeling
      await new Promise(resolve => setTimeout(resolve, 300));

      if (user) {
        const target = getRedirect();
        router.replace(target);
      } else {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen text-background-dark dark:text-white flex flex-col font-display">
        <AppHeader variant="landing" />
        <main className="flex-grow flex items-center justify-center p-6">
          <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-2 gap-0 border border-subtle overflow-hidden">
            <div className="bg-surface p-12 lg:p-16 min-h-[400px] lg:min-h-[600px] flex items-center justify-center">
              <div className="w-full h-full border border-white/5 bg-white/5 animate-pulse rounded-md" />
            </div>
            <div className="bg-white dark:bg-background-dark p-8 lg:p-12 border-l border-subtle flex items-center justify-center">
              <div className="w-full max-w-md h-96 border border-white/5 bg-white/5 animate-pulse rounded-md" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // SEC-004: Check lockout
    if (lockoutUntil > Date.now()) {
      const seconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${seconds}s.`);
      return;
    }

    // SEC-003: Password strength validation
    if (!useMagicLink && !showForgotPassword && isSignUp && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (showForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccess("Password reset link sent to your email!");
        setShowForgotPassword(false);
      } else if (useMagicLink) {
        const { error } = await signInWithMagicLink(email);
        if (error) throw error;
        setSuccess("Check your email for the magic link!");
      } else if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess("Account created! Redirecting...");
        router.replace(getRedirect());
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        router.replace(getRedirect());
      }
      setFailedAttempts(0);
    } catch (err: unknown) {
      logger.error({ err }, "Auth error:");
      // SEC-004: Exponential backoff after repeated failures
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const backoffMs = Math.min(1000 * Math.pow(2, newAttempts - MAX_FAILED_ATTEMPTS), 60000);
        setLockoutUntil(Date.now() + backoffMs);
      }
      // SEC-005: Normalize error messages
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(normalizeAuthError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-background-dark dark:text-white overflow-x-hidden font-display flex flex-col">
      {/* Navbar: Split Header Design */}
      <AppHeader variant="landing" />

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-2 gap-0 border border-subtle overflow-hidden">
          {/* Left Side: Geometric Art */}
          <div className="relative bg-surface p-12 lg:p-16 flex flex-col justify-center min-h-[400px] lg:min-h-[600px] overflow-hidden group">
            {/* Decorative Geometric Background Elements */}
            <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-bauhaus-blue opacity-20 blur-xl pointer-events-none"></div>
            <div className="absolute bottom-20 left-10 w-40 h-40 shape-triangle bg-bauhaus-red opacity-10 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-1 w-12 bg-bauhaus-red"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Authentication Portal</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase mb-6">
                {showForgotPassword ? (
                  <>Reset<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-bauhaus-blue to-bauhaus-blue">Password.</span></>
                ) : isSignUp ? (
                  <>Create<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-bauhaus-blue to-bauhaus-blue">Account.</span></>
                ) : (
                  <>Access<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-bauhaus-blue to-bauhaus-blue">Network.</span></>
                )}
              </h1>

              <p className="text-lg font-medium text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                {showForgotPassword
                  ? "Enter your email to receive a password reset link."
                  : "Authenticate to access the secure P2P file transfer network."}
              </p>

              {/* WebRTC Status Indicator */}
              <div className="flex items-center gap-3 mt-8">
                <div className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <span className="text-sm font-mono text-gray-400">Network Online // 128-bit AES</span>
              </div>
            </div>

            {/* Geometric decoration */}
            <div className="absolute bottom-8 right-8 opacity-50">
              <div className="relative w-24 h-24">
                <div className="absolute w-16 h-16 rounded-full border-4 border-bauhaus-blue"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 bg-primary rotate-45"></div>
              </div>
            </div>
          </div>

          {/* Right Side: Auth Form */}
          <div className="bg-white dark:bg-background-dark p-8 lg:p-12 flex flex-col justify-center border-l border-subtle">
            <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="auth-email" className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  className="w-full bg-surface border-2 border-subtle focus:border-primary text-white px-4 py-4 placeholder:text-gray-600 focus:ring-0 focus:outline-none transition-colors font-mono text-sm"
                  placeholder="user@hyperlink.network"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Input */}
              {!useMagicLink && !showForgotPassword && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="auth-password" className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-gray-500 hover:text-primary transition-colors uppercase font-bold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    id="auth-password"
                    className="w-full bg-surface border-2 border-subtle focus:border-primary text-white px-4 py-4 placeholder:text-gray-600 focus:ring-0 focus:outline-none transition-colors font-mono text-sm"
                    placeholder="••••••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!useMagicLink && !showForgotPassword}
                  />
                </div>
              )}

              {/* Messages */}
              {error && (
                <div className="bg-bauhaus-red/10 border border-bauhaus-red/30 px-4 py-3">
                  <p className="text-sm text-bauhaus-red font-medium">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-500/10 border border-green-500/30 px-4 py-3">
                  <p className="text-sm text-green-400 font-medium">{success}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                className="w-full bg-bauhaus-blue hover:bg-blue-600 text-white font-bold h-14 flex items-center justify-center gap-3 group transition-all duration-300 uppercase tracking-wider text-sm relative overflow-hidden"
                type="submit"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <span className="relative z-10">
                  {loading
                    ? "Processing..."
                    : showForgotPassword
                      ? "Send Reset Link"
                      : useMagicLink
                        ? "Send Magic Link"
                        : isSignUp
                          ? "Create Account"
                          : "Authenticate"}
                </span>
                <span className="material-symbols-outlined relative z-10 group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>

              {/* Alternative Options */}
              {!showForgotPassword && (
                <>
                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-subtle"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-600 text-xs uppercase font-bold tracking-wider">
                      Or
                    </span>
                    <div className="flex-grow border-t border-subtle"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setUseMagicLink(!useMagicLink)}
                      className="flex items-center justify-center gap-2 h-12 bg-surface border border-subtle hover:border-primary transition-colors text-sm font-bold uppercase text-gray-300 hover:text-white"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">
                        {useMagicLink ? "password" : "hub"}
                      </span>
                      <span>{useMagicLink ? "Password" : "Magic Link"}</span>
                    </button>
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="flex items-center justify-center gap-2 h-12 bg-surface border border-subtle hover:border-primary transition-colors text-sm font-bold uppercase text-gray-300 hover:text-white"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">
                        {isSignUp ? "login" : "person_add"}
                      </span>
                      <span>{isSignUp ? "Sign In" : "Sign Up"}</span>
                    </button>
                  </div>
                </>
              )}

              {showForgotPassword && (
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-wider"
                  type="button"
                >
                  ← Back to Sign In
                </button>
              )}
            </form>
          </div>
        </div>
      </main>


    </div>
  );
}
