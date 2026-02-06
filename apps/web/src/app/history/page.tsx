"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { useUserTransfersRealtime } from "@/lib/hooks/use-transfer-realtime";
import type { User } from "@supabase/supabase-js";
import { formatFileSize } from "@repo/utils";
import SimpleHeader from "@/components/simple-header";

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { transfers, loading: transfersLoading } = useUserTransfersRealtime();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push("/auth");
      return;
    }
    setUser(currentUser);
    setLoading(false);
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

  const filteredTransfers =
    filter === "all" ? transfers : transfers.filter((t) => t.status === filter);

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

  const stats = {
    total: transfers.length,
    complete: transfers.filter((t) => t.status === "complete").length,
    failed: transfers.filter((t) => t.status === "failed").length,
    totalSize: transfers.reduce((acc, t) => acc + (t.file_size || 0), 0),
  };

  return (
    <div className="bg-background-dark font-display text-white min-h-screen flex flex-col">
      <SimpleHeader userEmail={user?.email} />

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 lg:p-12 flex flex-col gap-8">
        {/* Header */}
        <header className="pb-6 border-b-4 border-[#4b4520]">
          <div className="w-12 h-1 bg-primary mb-4"></div>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase mb-4">
            Transfer
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
              History
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Complete archive of all your P2P file transfers.
          </p>
        </header>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#2a2614] border border-[#4b4520] p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">folder</span>
              <span className="text-xs text-gray-400 uppercase">Total Transfers</span>
            </div>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-[#2a2614] border border-[#4b4520] p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-green-400">check_circle</span>
              <span className="text-xs text-gray-400 uppercase">Completed</span>
            </div>
            <p className="text-3xl font-bold">{stats.complete}</p>
          </div>

          <div className="bg-[#2a2614] border border-[#4b4520] p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-red-400">error</span>
              <span className="text-xs text-gray-400 uppercase">Failed</span>
            </div>
            <p className="text-3xl font-bold">{stats.failed}</p>
          </div>

          <div className="bg-[#2a2614] border border-[#4b4520] p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-bauhaus-blue">database</span>
              <span className="text-xs text-gray-400 uppercase">Total Data</span>
            </div>
            <p className="text-3xl font-bold">
              {(stats.totalSize / 1e9).toFixed(1)}
              <span className="text-lg text-primary">GB</span>
            </p>
          </div>
        </section>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {["all", "complete", "transferring", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 uppercase text-sm font-bold border transition-colors ${
                filter === status
                  ? "bg-primary text-black border-primary"
                  : "bg-transparent text-gray-400 border-white/10 hover:border-primary hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Transfer List */}
        <section className="flex flex-col gap-4">
          {transfersLoading ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl animate-spin">
                progress_activity
              </span>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 bg-[#2a2614] border border-[#4b4520]">
              <span className="material-symbols-outlined text-6xl opacity-20">history</span>
              <p className="mt-4 text-gray-500">No transfers found for this filter.</p>
            </div>
          ) : (
            filteredTransfers.map((transfer) => {
              const style =
                statusColors[transfer.status as keyof typeof statusColors] || statusColors.pending;

              return (
                <div
                  key={transfer.id}
                  className="bg-[#2a2614] border border-[#4b4520] hover:border-primary/50 transition-colors p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                >
                  {/* File Icon & Name */}
                  <div className="col-span-12 md:col-span-5 flex items-center gap-4">
                    <div className={`size-12 rounded flex items-center justify-center ${style.bg}`}>
                      <span className={`material-symbols-outlined ${style.text}`}>
                        {style.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{transfer.filename}</p>
                      <p className="text-xs text-gray-500 mt-1">ID: {transfer.id.slice(0, 8)}</p>
                    </div>
                  </div>

                  {/* Size */}
                  <div className="col-span-6 md:col-span-2">
                    <p className="text-xs text-gray-400 md:hidden">Size</p>
                    <p className="text-white font-medium">{formatFileSize(transfer.file_size)}</p>
                  </div>

                  {/* Date */}
                  <div className="col-span-6 md:col-span-3">
                    <p className="text-xs text-gray-400 md:hidden">Date</p>
                    <p className="text-gray-300 text-sm">
                      {new Date(transfer.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="col-span-12 md:col-span-2 flex justify-end">
                    <span
                      className={`flex items-center gap-2 ${style.bg} px-3 py-2 border ${style.border}`}
                    >
                      <span
                        className={`size-2 rounded-full ${style.text.replace("text-", "bg-")} ${transfer.status === "transferring" ? "animate-pulse" : ""}`}
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
        </section>
      </main>

      {/* Footer */}
      <div className="mt-auto w-full h-2 flex">
        <div className="w-1/3 bg-bauhaus-blue"></div>
        <div className="w-1/3 bg-bauhaus-red"></div>
        <div className="w-1/3 bg-primary"></div>
      </div>
    </div>
  );
}
