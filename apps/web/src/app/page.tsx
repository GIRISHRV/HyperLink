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
    <div className="bg-background-light dark:bg-[#121212] min-h-screen text-[#121212] dark:text-white overflow-x-hidden font-display flex flex-col">
      {/* Navbar: Split Header Design */}
      <nav className="w-full flex flex-col md:flex-row border-b border-[#333]">
        {/* Left: Logo Block */}
        <Link href="/" className="bg-primary text-[#121212] px-8 py-6 flex items-center justify-center md:justify-start min-w-[200px] hover:bg-primary/90 transition-colors">
          <span className="font-black text-4xl tracking-tighter uppercase">HYPER</span>
        </Link>
        {/* Right: Navigation & Secondary Logo Part */}
        <div className="flex-1 bg-white dark:bg-[#121212] flex items-center justify-between px-8 py-4 md:py-0">
          <Link href="/" className="font-black text-4xl tracking-tighter uppercase text-[#121212] dark:text-white hover:opacity-80 transition-opacity">LINK</Link>
          <div className="flex gap-4 md:gap-8 items-center">
            <Link href="/about" className="text-sm font-bold uppercase tracking-wide text-[#121212] dark:text-white hover:text-primary dark:hover:text-primary transition-colors">
              About
            </Link>
            {!loading && (
              <Link href={user ? "/dashboard" : "/auth"}>
                <button className="h-12 px-6 bg-primary text-black text-sm font-bold uppercase tracking-wide hover:bg-yellow-400 transition-colors">
                  {user ? "Dashboard" : "Get Started"}
                </button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">
        {/* Hero Section: Asymmetric Grid */}
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[600px] border-b border-[#333]">
          {/* Text & Hero Content (Left/Top) */}
          <div className="lg:col-span-7 p-8 md:p-16 flex flex-col justify-center relative overflow-hidden">
            {/* Decorative Geometric Background Elements */}
            <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-bauhaus-blue opacity-20 blur-xl pointer-events-none"></div>
            <div className="absolute bottom-20 left-10 w-40 h-40 shape-triangle bg-bauhaus-red opacity-10 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-12 bg-bauhaus-red"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">P2P Encrypted Protocol</span>
              </div>

              <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase">
                Secure.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-bauhaus-blue to-bauhaus-blue">Direct.</span><br />
                Fast.
              </h1>

              <p className="text-lg md:text-xl font-medium text-gray-600 dark:text-gray-400 max-w-lg mt-4 leading-relaxed">
                Peer-to-peer encrypted file transfer. No servers. Just geometry and code. Drag, drop, and vanish.
              </p>

              {/* WebRTC Status Indicator (Visual) */}
              <div className="flex items-center gap-3 mt-8">
                <div className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <span className="text-sm font-mono text-gray-400">WebRTC Ready // 128-bit AES</span>
              </div>
            </div>
          </div>

          {/* Geometric Composition & CTAs (Right/Bottom) */}
          <div className="lg:col-span-5 border-l border-[#333] flex flex-col">
            {/* Abstract Art Piece */}
            <div className="flex-1 relative bg-[#1a1a1a] min-h-[300px] overflow-hidden flex items-center justify-center p-8 group">
              {/* This section represents the 'connection' visually */}
              <div className="relative w-64 h-64">
                {/* Blue Circle */}
                <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-bauhaus-blue mix-blend-screen opacity-90 transition-transform duration-700 group-hover:translate-x-4"></div>
                {/* Red Triangle */}
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-bauhaus-red shape-triangle mix-blend-screen opacity-90 transition-transform duration-700 group-hover:-translate-x-4"></div>
                {/* Yellow Rectangle */}
                <div className="absolute top-[40%] left-[30%] w-24 h-24 bg-primary mix-blend-multiply opacity-90 rotate-12 transition-transform duration-500 group-hover:rotate-45"></div>
              </div>
              <div className="absolute bottom-4 right-4 text-xs font-mono text-gray-500 opacity-50">
                FIG 01. HANDSHAKE
              </div>
            </div>

            {/* Action Blocks */}
            <div className="grid grid-cols-2 h-[200px] md:h-[240px]">
              {/* Send Block */}
              <Link href={user ? "/send" : "/auth"} className="bg-bauhaus-blue hover:bg-blue-600 text-white flex flex-col items-center justify-center gap-4 group transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <span className="material-symbols-outlined text-4xl md:text-5xl group-hover:-translate-y-2 transition-transform">arrow_upward</span>
                <div className="flex flex-col items-center text-center">
                  <span className="font-bold text-xl tracking-wider uppercase">SEND</span>
                  <span className="text-xs text-white/70 uppercase tracking-wider">Drag & Drop</span>
                </div>
              </Link>

              {/* Receive Block */}
              <Link href={user ? "/receive" : "/auth"} className="bg-bauhaus-red hover:bg-red-600 text-white flex flex-col items-center justify-center gap-4 group transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <span className="material-symbols-outlined text-4xl md:text-5xl group-hover:translate-y-2 transition-transform">arrow_downward</span>
                <div className="flex flex-col items-center text-center">
                  <span className="font-bold text-xl tracking-wider uppercase">RECEIVE</span>
                  <span className="text-xs text-white/70 uppercase tracking-wider">Enter Code</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Grid: Asymmetric Columns */}
        <div className="w-full max-w-[1440px] mx-auto px-6 py-20 bg-background-light dark:bg-[#121212]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {/* Feature 1 */}
            <div className="flex flex-col gap-6 group">
              <div className="w-16 h-16 rounded-full bg-bauhaus-blue flex items-center justify-center text-white mb-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
                <span className="material-symbols-outlined text-3xl">encrypted</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">End-to-End Encrypted</h3>
              <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                Your data never touches a server. The keys are generated on your device and only shared with the recipient.
              </p>
              <div className="h-1 w-0 group-hover:w-full bg-bauhaus-blue transition-all duration-500 ease-out"></div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col gap-6 group">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-[#121212] mb-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
                <span className="material-symbols-outlined text-3xl">bolt</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">WebRTC Speed</h3>
              <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                Direct browser-to-browser transfer path ensures maximum bandwidth utilization. No middleman throttling.
              </p>
              <div className="h-1 w-0 group-hover:w-full bg-primary transition-all duration-500 ease-out"></div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col gap-6 group">
              <div className="w-16 h-16 rounded-full bg-bauhaus-red flex items-center justify-center text-white mb-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
                <span className="material-symbols-outlined text-3xl">all_inclusive</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">No File Limits</h3>
              <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                Send gigabytes of data as easily as a text message. If your browser can handle it, we can send it.
              </p>
              <div className="h-1 w-0 group-hover:w-full bg-bauhaus-red transition-all duration-500 ease-out"></div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer: Tri-Color Strip */}
      <footer className="mt-auto">
        {/* Colorful Strip */}
        <div className="flex h-3 w-full">
          <div className="flex-1 bg-bauhaus-blue"></div>
          <div className="flex-1 bg-bauhaus-red"></div>
          <div className="flex-1 bg-primary"></div>
        </div>

        {/* Footer Content */}
        <div className="bg-[#0f0f0f] py-12 px-8 border-t border-[#333]">
          <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center justify-center md:justify-start gap-1">
              <span className="font-black text-xl tracking-tighter uppercase text-white">HYPER</span>
              <span className="font-black text-xl tracking-tighter uppercase text-gray-500">LINK</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
