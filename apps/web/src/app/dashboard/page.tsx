"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { useUserTransfersRealtime } from "@/lib/hooks/use-transfer-realtime";
import type { User } from "@supabase/supabase-js";
import { formatFileSize } from "@repo/utils";
import Link from "next/link";
import SimpleHeader from "@/components/simple-header";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { transfers, loading: transfersLoading } = useUserTransfersRealtime();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/auth");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    } catch (e) {
      console.error("Auth check failed:", e);
      router.push("/auth");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  const totalShared = transfers.reduce((acc, t) => acc + (t.file_size || 0), 0);
  const activePeers = transfers.filter((t) => t.status === "transferring").length;

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden">
      <SimpleHeader userEmail={user?.email} />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 lg:p-12 flex flex-col gap-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-4 border-[#4b4520]">
          <div>
            <p className="text-primary font-medium tracking-widest mb-2 uppercase text-sm">
              System Overview
            </p>
            <h2 className="text-5xl md:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase">
              Dash
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                Board
              </span>
            </h2>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 md:gap-8">
            <div className="flex flex-col border-l-2 border-primary pl-4">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Total Shared</span>
              <span className="text-2xl font-bold text-white">
                {(totalShared / 1e9).toFixed(1)}
                <span className="text-primary text-lg">GB</span>
              </span>
            </div>
            <div className="flex flex-col border-l-2 border-primary pl-4">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Active Peers</span>
              <span className="text-2xl font-bold text-white">{activePeers}</span>
            </div>
          </div>
        </header>

        {/* Action Cards Grid (Asymmetric) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[320px]">
          {/* SEND FILES Card (Blue Accent) - Takes 7/12 columns on large screens */}
          <Link
            href="/send"
            className="lg:col-span-7 relative group overflow-hidden bg-[#2a2614] border border-[#4b4520] rounded-lg transition-all duration-300 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:-translate-y-1"
          >
            {/* Geometric Decoration */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-bauhaus-blue rounded-bl-full opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="absolute right-8 top-8 text-bauhaus-blue opacity-50">
              <span className="material-symbols-outlined text-8xl rotate-45 group-hover:rotate-0 transition-transform duration-500">
                send
              </span>
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between p-8">
              <div>
                <div className="w-12 h-12 bg-bauhaus-blue flex items-center justify-center rounded mb-6 text-white shadow-lg">
                  <span className="material-symbols-outlined">arrow_upward</span>
                </div>
                <h3 className="text-4xl font-bold text-white mb-2 uppercase tracking-tight">
                  Send Files
                </h3>
                <p className="text-gray-400 max-w-sm">
                  Initiate a secure P2P transfer. Drag and drop files here or click to browse local
                  storage.
                </p>
              </div>
            </div>
          </Link>

          {/* RECEIVE FILES Card (Red Accent) - Takes 5/12 columns on large screens */}
          <Link
            href="/receive"
            className="lg:col-span-5 relative group overflow-hidden bg-[#2a2614] border border-[#4b4520] rounded-lg transition-all duration-300 hover:border-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:-translate-y-1"
          >
            {/* Geometric Decoration */}
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-bauhaus-red rounded-full opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="absolute right-8 top-8 text-bauhaus-red opacity-50">
              <span className="material-symbols-outlined text-8xl group-hover:scale-110 transition-transform duration-500">
                qr_code_scanner
              </span>
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between p-8">
              <div>
                <div className="w-12 h-12 bg-bauhaus-red flex items-center justify-center rounded mb-6 text-white shadow-lg">
                  <span className="material-symbols-outlined">arrow_downward</span>
                </div>
                <h3 className="text-4xl font-bold text-white mb-2 uppercase tracking-tight">
                  Receive
                </h3>
                <p className="text-gray-400">
                  Open a connection to receive files from peers securely.
                </p>
              </div>
            </div>
          </Link>
        </section>

        {/* Recent Transfers Section */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[#4b4520] pb-2">
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
              <span className="w-3 h-3 bg-primary block"></span>
              Recent Transfers
            </h3>
            <Link
              href="/history"
              className="text-sm text-primary hover:text-white font-medium flex items-center gap-1 transition-colors"
            >
              View All History{" "}
              <span className="material-symbols-outlined text-sm">arrow_outward</span>
            </Link>
          </div>

          {/* Table Header (Visible on Desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
            <div className="col-span-5">File Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3">Transfer Details</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {/* List Items */}
          <div className="flex flex-col gap-3">
            {transfersLoading ? (
              <div className="text-center py-12 text-gray-500">
                <span className="material-symbols-outlined text-4xl animate-spin">
                  progress_activity
                </span>
              </div>
            ) : transfers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <span className="material-symbols-outlined text-6xl opacity-20">upload</span>
                <p className="mt-4">No transfers yet. Start by sending or receiving a file!</p>
              </div>
            ) : (
              transfers.slice(0, 4).map((transfer) => {
                const statusColors = {
                  pending: {
                    bg: "bg-yellow-900/30",
                    border: "border-yellow-900/50",
                    text: "text-primary",
                    icon: "folder",
                  },
                  connecting: {
                    bg: "bg-blue-900/30",
                    border: "border-blue-900/50",
                    text: "text-blue-400",
                    icon: "sync",
                  },
                  transferring: {
                    bg: "bg-blue-900/30",
                    border: "border-blue-900/50",
                    text: "text-blue-400",
                    icon: "sync",
                  },
                  complete: {
                    bg: "bg-green-900/30",
                    border: "border-green-900/50",
                    text: "text-green-400",
                    icon: "check_circle",
                  },
                  failed: {
                    bg: "bg-red-900/30",
                    border: "border-red-900/50",
                    text: "text-red-400",
                    icon: "error",
                  },
                  cancelled: {
                    bg: "bg-gray-900/30",
                    border: "border-gray-900/50",
                    text: "text-gray-400",
                    icon: "cancel",
                  },
                };

                const style =
                  statusColors[transfer.status as keyof typeof statusColors] ||
                  statusColors.pending;

                return (
                  <div
                    key={transfer.id}
                    className="group bg-[#2a2614] border border-[#4b4520] hover:border-primary/50 transition-colors rounded p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                  >
                    <div className="col-span-12 md:col-span-5 flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-black transition-colors">
                        <span className="material-symbols-outlined">{style.icon}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white truncate">{transfer.filename}</p>
                        <p className="text-xs text-gray-500 md:hidden">
                          {formatFileSize(transfer.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="hidden md:block col-span-2 text-gray-300 font-medium">
                      {formatFileSize(transfer.file_size)}
                    </div>
                    <div className="hidden md:block col-span-3 text-gray-400 text-sm">
                      {new Date(transfer.created_at).toLocaleDateString()}
                    </div>
                    <div className="col-span-12 md:col-span-2 flex items-center justify-between md:justify-end gap-3">
                      <span
                        className={`flex items-center gap-2 ${style.bg} px-3 py-1 rounded-full border ${style.border}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${style.text.replace("text-", "bg-")} ${transfer.status === "transferring" ? "animate-pulse" : ""}`}
                        ></span>
                        <span className={`text-xs font-bold ${style.text} uppercase`}>
                          {transfer.status}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Footer decoration (Bauhaus Strip) */}
      <div className="mt-auto w-full h-2 flex">
        <div className="w-1/3 bg-bauhaus-blue"></div>
        <div className="w-1/3 bg-bauhaus-red"></div>
        <div className="w-1/3 bg-primary"></div>
      </div>
    </div>
  );
}
