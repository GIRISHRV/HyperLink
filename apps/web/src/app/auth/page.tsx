"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signUp, signInWithMagicLink, resetPassword } from "@/lib/services/auth-service";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { getCurrentUser } = await import("@/lib/services/auth-service");
      const user = await getCurrentUser();
      if (user) {
        router.replace("/dashboard");
      }
    };
    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (showForgotPassword) {
        await resetPassword(email);
        setSuccess("Password reset link sent to your email!");
        setShowForgotPassword(false);
      } else if (useMagicLink) {
        await signInWithMagicLink(email);
        setSuccess("Check your email for the magic link!");
      } else if (isSignUp) {
        await signUp(email, password);
        setSuccess("Account created! Redirecting...");
        router.push("/dashboard");
      } else {
        await signIn(email, password);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-gray-900 dark:text-white min-h-screen flex flex-col overflow-hidden relative selection:bg-primary selection:text-black">
      {/* Abstract Bauhaus Background Shapes */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute inset-0 bauhaus-grid opacity-30"></div>
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full border border-gray-700"></div>
        <div className="absolute bottom-[-5%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full"></div>
        <div className="absolute top-[20%] right-[10%] w-0 h-0 border-l-[50px] border-l-transparent border-t-[75px] border-t-bauhaus-red/20 border-r-[50px] border-r-transparent transform rotate-12"></div>
        <div className="absolute bottom-[20%] left-[10%] w-32 h-32 border-4 border-bauhaus-blue/20 rotate-45"></div>
      </div>

      {/* Top Navigation */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 lg:px-12 border-b border-gray-800 bg-background-dark/80 backdrop-blur-md">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 bg-white text-black rounded-full">
            <span className="material-symbols-outlined text-xl">bolt</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase">HyperLink</h1>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
          <Link href="/status" className="hover:text-primary transition-colors">
            Network Status
          </Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md relative group perspective-1000">
          {/* Bauhaus Decorative Elements */}
          <div className="absolute -top-6 -left-6 size-12 bg-bauhaus-blue z-0 hidden md:block"></div>
          <div className="absolute -bottom-4 -right-4 size-24 border-2 border-primary z-0 hidden md:block rounded-full"></div>

          {/* Card */}
          <div className="relative z-10 bg-surface-dark border border-gray-700 shadow-2xl flex flex-col md:flex-row overflow-hidden">
            <div className="w-2 md:w-3 bg-bauhaus-red flex-shrink-0"></div>

            <div className="flex-1 p-8 md:p-10 flex flex-col gap-6">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tighter uppercase text-white">
                    {showForgotPassword ? "Reset" : "Sign In"}
                  </h2>
                  <div className="size-8 rounded-full border border-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">lock</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm font-light">
                  {showForgotPassword
                    ? "Enter your email to reset password."
                    : "Access the secure P2P network node."}
                </p>
              </div>

              {/* Form */}
              <form className="flex flex-col gap-5 mt-2" onSubmit={handleSubmit}>
                {/* Email Input */}
                <div className="space-y-1 group/input">
                  <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-transparent border-2 border-gray-600 focus:border-white text-white px-4 py-3 placeholder:text-gray-600 focus:ring-0 focus:outline-none transition-colors rounded-sm"
                      placeholder="user@hyperlink.network"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
                      <span className="material-symbols-outlined text-lg">alternate_email</span>
                    </div>
                  </div>
                </div>

                {/* Password Input */}
                {!useMagicLink && !showForgotPassword && (
                  <div className="space-y-1 group/input">
                    <div className="flex justify-between items-end ml-1">
                      <label className="text-xs font-bold text-primary uppercase tracking-widest">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase border-b border-transparent hover:border-gray-500"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        className="w-full bg-transparent border-2 border-gray-600 focus:border-white text-white px-4 py-3 placeholder:text-gray-600 focus:ring-0 focus:outline-none transition-colors rounded-sm"
                        placeholder="••••••••••••"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={!useMagicLink && !showForgotPassword}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
                        <span className="material-symbols-outlined text-lg">key</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {error && <p className="text-xs text-bauhaus-red">{error}</p>}
                {success && <p className="text-xs text-green-400">{success}</p>}

                {/* Submit Button */}
                <button
                  className="mt-4 w-full bg-bauhaus-blue hover:bg-blue-700 text-white font-bold h-12 flex items-center justify-center gap-2 group transition-all duration-300 rounded-sm relative overflow-hidden"
                  type="submit"
                  disabled={loading}
                >
                  <span className="relative z-10 tracking-widest uppercase text-sm">
                    {loading
                      ? "Loading..."
                      : showForgotPassword
                        ? "Send Reset Link"
                        : useMagicLink
                          ? "Send Magic Link"
                          : isSignUp
                            ? "Create Account"
                            : "Authenticate"}
                  </span>
                  <span className="material-symbols-outlined relative z-10 text-lg group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
              </form>

              {/* Alternative Options */}
              {!showForgotPassword && (
                <>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-800"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-600 text-xs uppercase">
                      Or connect via
                    </span>
                    <div className="flex-grow border-t border-gray-800"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setUseMagicLink(!useMagicLink)}
                      className="flex items-center justify-center gap-2 h-10 border border-gray-700 hover:bg-gray-800 hover:border-gray-500 transition-colors rounded-sm text-sm text-gray-300"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">
                        {useMagicLink ? "alternate_email" : "hub"}
                      </span>
                      <span>{useMagicLink ? "Email" : "Magic Link"}</span>
                    </button>
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="flex items-center justify-center gap-2 h-10 border border-gray-700 hover:bg-gray-800 hover:border-gray-500 transition-colors rounded-sm text-sm text-gray-300"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">qr_code_2</span>
                      <span>{isSignUp ? "Sign In" : "Sign Up"}</span>
                    </button>
                  </div>
                </>
              )}

              {showForgotPassword && (
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                  type="button"
                >
                  ← Back to Sign In
                </button>
              )}
            </div>
          </div>

          <div className="absolute -right-12 bottom-10 z-0 hidden lg:block opacity-60">
            <div className="w-24 h-24 bg-primary rounded-full mix-blend-difference"></div>
          </div>
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="relative z-20 py-6 border-t border-gray-800 text-center text-xs text-gray-500 uppercase tracking-widest flex justify-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-xl text-primary">lock</span>
          <span className="font-bold">End-to-End Encrypted</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-xl text-bauhaus-blue">shield</span>
          <span className="font-bold">Secure P2P Protocol</span>
        </div>
      </footer>
    </div>
  );
}
