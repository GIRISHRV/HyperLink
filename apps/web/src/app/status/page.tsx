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
        const response = await fetch(
          `http://${process.env.NEXT_PUBLIC_PEER_SERVER_HOST}:${parseInt(process.env.NEXT_PUBLIC_PEER_SERVER_PORT!) + 1}/health`
        );

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
    <div className="bg-background-dark text-white min-h-screen flex flex-col font-display selection:bg-primary selection:text-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-background-dark/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 bg-white text-black rounded-full">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight uppercase">HyperLink</h1>
          </Link>
          <Link
            href="/settings"
            className="size-10 bg-gray-700 rounded-full border-2 border-primary/20 hover:border-primary flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Title Section */}
          <div className="mb-12">
            <div className="w-12 h-1 bg-primary mb-4"></div>
            <h2 className="text-5xl md:text-6xl font-bold uppercase tracking-tighter leading-tight mb-4">
              Network
              <br />
              Status
            </h2>
            <p className="text-gray-400 text-lg">
              Real-time health monitoring of P2P signaling infrastructure.
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-surface-dark border border-white/10 p-8 space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">Checking network status...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-bauhaus-red mb-4">
                  error
                </span>
                <h3 className="text-2xl font-bold mb-2">Signaling Server Offline</h3>
                <p className="text-gray-400">Unable to connect to the peer signaling service.</p>
              </div>
            ) : health ? (
              <>
                {/* Overall Status */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                  <div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight">
                      All Systems Operational
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Last updated: {new Date(health.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50">
                    <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-bold uppercase text-sm">Online</span>
                  </div>
                </div>

                {/* Service Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Service Name */}
                  <div className="p-4 bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary">cloud</span>
                      <span className="text-xs text-gray-400 uppercase tracking-widest">
                        Service
                      </span>
                    </div>
                    <p className="text-xl font-bold">{health.service}</p>
                  </div>

                  {/* Uptime */}
                  <div className="p-4 bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-bauhaus-blue">schedule</span>
                      <span className="text-xs text-gray-400 uppercase tracking-widest">
                        Uptime
                      </span>
                    </div>
                    <p className="text-xl font-bold">{formatUptime(health.uptime)}</p>
                  </div>

                  {/* Status */}
                  <div className="p-4 bg-white/5 border border-white/10 md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-green-500">check_circle</span>
                      <span className="text-xs text-gray-400 uppercase tracking-widest">
                        Status
                      </span>
                    </div>
                    <p className="text-xl font-bold capitalize">{health.status}</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">
                      info
                    </span>
                    The signaling server coordinates peer connections but does not handle file data.
                    All transfers occur directly between peers.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 flex justify-center">
        <div className="flex items-center gap-2 opacity-50">
          <div className="size-3 bg-primary"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            HyperLink
          </span>
        </div>
      </footer>
    </div>
  );
}
