"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface HealthData {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;
  peers?: number;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const protocol = window.location.protocol === "https:" ? "https" : "http";
        const host = process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
        const port = process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
        const response = await fetch(`${protocol}://${host}:${port}/health`);

        if (response.ok) {
          const data = await response.json();
          setHealth(data);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="bg-transparent min-h-screen text-[#121212] dark:text-white overflow-x-hidden font-display flex flex-col">
      {/* Navbar: Split Header Design */}
      <nav className="w-full flex flex-col md:flex-row border-b border-[#333]">
        {/* Left: Logo Block */}
        <div className="bg-primary text-[#121212] px-8 py-6 flex items-center justify-center md:justify-start min-w-[200px]">
          <span className="font-black text-4xl tracking-tighter uppercase">HYPER</span>
        </div>
        {/* Right: Navigation & Secondary Logo Part */}
        <div className="flex-1 bg-white dark:bg-[#121212] flex items-center justify-between px-8 py-4 md:py-0">
          <span className="font-black text-4xl tracking-tighter uppercase text-[#121212] dark:text-white">LINK</span>
          <div className="flex gap-4 md:gap-8 items-center">
            <Link href="/">
              <button className="h-12 px-6 bg-[#333] hover:bg-[#555] text-white text-sm font-bold uppercase tracking-wide transition-colors">
                ← Back
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-[1200px]">
          {/* Title Section */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-12 bg-bauhaus-red"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">System Monitor</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase mb-4">
              Network<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-bauhaus-blue to-bauhaus-blue">Status.</span>
            </h1>
            <p className="text-lg md:text-xl font-medium text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              Real-time health monitoring of P2P signaling infrastructure.
            </p>
          </div>

          {/* Status Display */}
          {loading ? (
            <div className="bg-[#1a1a1a] border border-[#333] p-16 text-center">
              <div className="inline-block size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-gray-400 font-mono text-sm uppercase tracking-wider">Checking network status...</p>
            </div>
          ) : error ? (
            <div className="bg-[#1a1a1a] border border-[#333] p-16 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-bauhaus-red/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-bauhaus-red">error</span>
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight mb-3">Signaling Server Offline</h3>
              <p className="text-gray-400 font-medium">Unable to connect to the peer signaling service.</p>
            </div>
          ) : health ? (
            <div className="space-y-6">
              {/* Overall Status Header */}
              <div className="bg-[#1a1a1a] border border-[#333] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tight mb-2">
                    All Systems Operational
                  </h3>
                  <p className="text-gray-400 text-sm font-mono">
                    Last updated: {new Date(health.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-green-500/10 border-2 border-green-500">
                  <div className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </div>
                  <span className="text-green-400 font-black uppercase text-sm tracking-wider">Online</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Service Name */}
                <div className="bg-[#1a1a1a] border border-[#333] p-8 relative group hover:border-bauhaus-blue transition-colors">
                  <div className="absolute top-4 right-4">
                    <div className="w-12 h-12 rounded-full bg-bauhaus-blue/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-bauhaus-blue text-2xl">cloud</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Service</span>
                  </div>
                  <p className="text-2xl font-black uppercase tracking-tight">{health.service}</p>
                  <div className="h-1 w-0 group-hover:w-full bg-bauhaus-blue transition-all duration-500 ease-out mt-4"></div>
                </div>

                {/* Uptime */}
                <div className="bg-[#1a1a1a] border border-[#333] p-8 relative group hover:border-primary transition-colors">
                  <div className="absolute top-4 right-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Uptime</span>
                  </div>
                  <p className="text-2xl font-black uppercase tracking-tight">{formatUptime(health.uptime)}</p>
                  <div className="h-1 w-0 group-hover:w-full bg-primary transition-all duration-500 ease-out mt-4"></div>
                </div>

                {/* Status */}
                <div className="bg-[#1a1a1a] border border-[#333] p-8 relative group hover:border-green-500 transition-colors">
                  <div className="absolute top-4 right-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Status</span>
                  </div>
                  <p className="text-2xl font-black uppercase tracking-tight">{health.status}</p>
                  <div className="h-1 w-0 group-hover:w-full bg-green-500 transition-all duration-500 ease-out mt-4"></div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-bauhaus-blue/10 border border-bauhaus-blue/30 p-6 flex items-start gap-4">
                <span className="material-symbols-outlined text-bauhaus-blue text-2xl flex-shrink-0">info</span>
                <p className="text-sm text-gray-300 leading-relaxed font-medium">
                  The signaling server coordinates peer connections but does not handle file data.
                  All transfers occur directly between peers with end-to-end encryption.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer: Tri-Color Strip */}
      <footer className="mt-auto">
        <div className="flex h-2 w-full">
          <div className="flex-1 bg-bauhaus-blue"></div>
          <div className="flex-1 bg-bauhaus-red"></div>
          <div className="flex-1 bg-primary"></div>
        </div>
      </footer>
    </div>
  );
}
