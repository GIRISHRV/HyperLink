"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/services/auth-service";
import Link from "next/link";

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }

  return (
    <div className="bg-background-dark text-white overflow-x-hidden min-h-screen flex flex-col font-display selection:bg-primary selection:text-black">
      {/* Header */}
      <header className="w-full absolute top-0 z-50 pt-6 px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 bg-primary relative overflow-hidden">
              <div className="absolute inset-0 border-2 border-black translate-x-1 translate-y-1"></div>
            </div>
            <span className="text-xl font-bold tracking-tight uppercase">HyperLink</span>
          </div>
          {!loading && (
            <Link href={user ? "/dashboard" : "/auth"}>
              <button className="h-12 px-6 bg-primary text-black text-sm font-bold uppercase tracking-wide hover:bg-white transition-colors">
                {user ? "Dashboard" : "Get Started"}
              </button>
            </Link>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col relative">
        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col justify-center px-6 overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 bauhaus-grid pointer-events-none"></div>

          {/* Geometric Shapes */}
          <div className="absolute top-20 right-[5%] w-48 h-48 bg-bauhaus-red rounded-full mix-blend-exclusion opacity-60 hidden lg:block"></div>
          <div className="absolute bottom-20 left-[10%] w-32 h-32 border-[16px] border-bauhaus-blue opacity-60 hidden lg:block"></div>

          <div className="max-w-[1200px] mx-auto w-full relative z-10 grid lg:grid-cols-12 gap-12 items-center pt-20">
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col">
              <h1 className="text-[14vw] lg:text-[11rem] font-bold leading-[0.8] tracking-tighter text-white mix-blend-difference select-none mb-6">
                HYPER
                <br />
                <span className="text-primary pl-4 lg:pl-32 block">LINK</span>
              </h1>
              <div className="lg:ml-32 max-w-lg">
                <h2 className="text-2xl font-mono text-gray-400 border-l-4 border-primary pl-6 py-1 mb-8">
                  Direct P2P File Transfer.
                  <br />
                  Pure Speed.
                </h2>
                {!loading && (
                  <Link href={user ? "/dashboard" : "/auth"}>
                    <button className="h-16 px-10 bg-primary text-black font-bold text-lg uppercase tracking-wider hover:bg-white hover:text-black transition-all flex items-center gap-3 group w-full sm:w-auto justify-center">
                      <span>{user ? "Go to Dashboard" : "Get Started Now"}</span>
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Right Column - Geometric Composition */}
            <div className="lg:col-span-5 hidden lg:flex justify-end relative">
              <div className="relative w-80 h-[28rem] border border-white/20 p-6 bg-surface-dark/50 backdrop-blur-sm">
                <div className="absolute -top-4 -right-4 w-full h-full border border-white/10 -z-10"></div>
                <div className="h-full flex flex-col gap-4">
                  <div className="flex-1 bg-primary relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  </div>
                  <div className="h-32 flex gap-4">
                    <div className="w-2/3 bg-bauhaus-blue rounded-tr-[4rem]"></div>
                    <div className="w-1/3 border-2 border-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">share</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 border-t border-white/10 bg-background-dark relative z-20">
          <div className="max-w-[1200px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-12 mb-8">
                <h3 className="text-4xl font-bold uppercase tracking-tight">Core Features</h3>
              </div>

              {/* Feature 1: Lightning Speed */}
              <div className="lg:col-span-7 bg-surface-dark border border-white/10 p-10 flex flex-col justify-between h-[360px] relative group hover:border-primary transition-colors">
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-6xl text-primary">bolt</span>
                </div>
                <div>
                  <span className="font-mono text-primary mb-4 block">01.</span>
                  <h4 className="text-3xl font-bold uppercase mb-4">Lightning Speed</h4>
                  <p className="text-gray-400 text-lg max-w-md">
                    Direct peer-to-peer mesh technology. Cuts out the middleman server completely
                    for maximum throughput.
                  </p>
                </div>
                <div className="w-full h-1 bg-white/10 mt-auto overflow-hidden">
                  <div className="h-full bg-primary w-3/4"></div>
                </div>
              </div>

              {/* Feature 2: Total Security */}
              <div className="lg:col-span-5 bg-surface-dark border border-white/10 p-10 flex flex-col justify-between h-[360px] hover:border-bauhaus-blue transition-colors group">
                <div className="mb-4">
                  <span className="font-mono text-bauhaus-blue mb-4 block">02.</span>
                  <h4 className="text-2xl font-bold uppercase mb-2">Total Security</h4>
                  <p className="text-gray-400">End-to-End Encrypted. Only you hold the keys.</p>
                </div>
                <div className="self-end p-4 bg-bauhaus-blue text-white">
                  <span className="material-symbols-outlined text-4xl">shield_lock</span>
                </div>
              </div>

              {/* Feature 3: No Size Limits */}
              <div className="lg:col-span-12 bg-surface-dark border border-white/10 p-10 flex items-center justify-between hover:border-bauhaus-red transition-colors group">
                <div className="flex flex-col md:flex-row md:items-center gap-8">
                  <div className="size-16 bg-bauhaus-red flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined text-3xl">all_inclusive</span>
                  </div>
                  <div>
                    <span className="font-mono text-bauhaus-red mb-1 block">03.</span>
                    <h4 className="text-2xl font-bold uppercase">No Size Limits</h4>
                    <p className="text-gray-400 mt-1">Transfer files of any size, anywhere.</p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <span className="material-symbols-outlined text-6xl text-white/5 group-hover:text-white/20 transition-colors">
                    database
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-background-dark">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="size-4 bg-primary"></div>
            <span className="text-sm font-bold uppercase tracking-wider text-gray-300">
              HyperLink
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
