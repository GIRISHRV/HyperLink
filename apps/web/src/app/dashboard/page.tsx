"use client";

import { useEffect, useState } from "react";
import { useUserTransfersRealtime } from "@/lib/hooks/use-transfer-realtime";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import EmptyState from "@/components/empty-state";
import { Ripple } from "@/components/ripple";
import { Button } from "@/components/ui/button";
import { formatFileSize, STATUS_CONFIG } from "@repo/utils";
import type { StatusConfigKey } from "@repo/utils";
import AppHeader from "@/components/app-header";
import Link from "next/link";

// Admin Quick Access Component
function AdminQuickAccess({ userId }: { userId: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const { data } = await supabase
          .from("user_profiles")
          .select("is_admin")
          .eq("user_id", userId)
          .single();
        setIsAdmin(data?.is_admin || false);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 bg-surface-elevated p-6 rounded-none border-t-4 border-purple-500 relative overflow-hidden animate-pulse">
        <div className="h-20 bg-white/5 rounded"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Don't show for non-admin users
  }

  return (
    <div className="flex-1 bg-surface-elevated p-6 rounded-none border-t-4 border-purple-500 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Administration
          </h3>
          <span className="material-symbols-outlined text-purple-400">security</span>
        </div>
        <div className="space-y-3">
          <Link
            href="/admin"
            className="block w-full bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-400 text-purple-300 font-bold py-2 px-3 transition-all text-xs uppercase tracking-wider text-center"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/admin/incidents"
            className="block w-full bg-orange-900/20 hover:bg-orange-900/40 border border-orange-500/30 hover:border-orange-400 text-orange-300 font-bold py-2 px-3 transition-all text-xs uppercase tracking-wider text-center"
          >
            Manage Incidents
          </Link>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
    </div>
  );
}

export default function DashboardPage() {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { transfers, loading: transfersLoading, removeTransfer } = useUserTransfersRealtime();

  const { user, loading } = useRequireAuth();

  // Timer that pauses when tab is hidden to save CPU
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      interval = setInterval(() => setCurrentTime(new Date()), 1000);
    };
    const stopTimer = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        setCurrentTime(new Date()); // Sync immediately
        startTimer();
      }
    };

    startTimer();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 lg:p-12 animate-reveal relative overflow-hidden">
        {/* Skeleton Background Graph */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-white/10 backdrop-blur-sm rounded-none" />
              <div className="h-6 bg-white/10 backdrop-blur-sm rounded w-32" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 bg-white/10 backdrop-blur-sm rounded w-40" />
              <div className="size-10 bg-white/10 backdrop-blur-sm rounded-full" />
            </div>
          </div>

          {/* Dashboard Content Skeleton */}
          <div className="space-y-6 animate-pulse">
            {/* Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 border-l-[8px] border-l-bauhaus-blue p-10 rounded-r-sm h-52 mask-container" />
                <div className="bg-white/5 backdrop-blur-md border border-white/10 border-l-[8px] border-l-bauhaus-red p-8 rounded-r-sm h-32" />
              </div>
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-none border border-white/10 border-t-4 border-t-primary h-48" />
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-none border border-white/10 border-t-4 border-t-bauhaus-blue h-48" />
              </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="bg-white/5 backdrop-blur-md rounded-none p-6 border border-white/10">
              <div className="h-6 bg-white/10 backdrop-blur-sm rounded w-48 mb-6" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 py-4 border-b border-white/5">
                    <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                      <div className="size-10 bg-white/10 backdrop-blur-sm rounded-none" />
                      <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-32" />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <div className="h-3 bg-white/10 backdrop-blur-sm rounded w-16" />
                    </div>
                    <div className="hidden md:block md:col-span-3">
                      <div className="h-3 bg-white/10 backdrop-blur-sm rounded w-24" />
                    </div>
                    <div className="col-span-4 md:col-span-3 flex justify-end">
                      <div className="h-6 bg-white/10 backdrop-blur-sm rounded-full w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalShared = transfers.reduce((acc, t) => acc + (t.file_size || 0), 0);

  const formatTime = () => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone.split("/").pop() || timezone;
  };

  async function handleDelete(transferId: string) {
    await removeTransfer(transferId);
    setConfirmDeleteId(null);
  }

  return (
    <div className="min-h-screen flex flex-col font-display bg-transparent relative overflow-x-hidden selection:bg-primary selection:text-black animate-reveal">
      <AppHeader variant="app" />

      {/* Main Dashboard */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 lg:p-12">
        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT COLUMN (Actions) - Spans 8 cols */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Send File Card */}
            <div className="group relative bg-surface-elevated border-l-[8px] border-bauhaus-blue p-8 md:p-10 rounded-r-sm overflow-hidden hover:bg-surface-elevated interactive-card">
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[120px]">upload_file</span>
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div>
                  <h2 className="font-black text-3xl md:text-4xl text-white mb-2 uppercase tracking-tight">
                    Send File
                  </h2>
                  <p className="text-gray-400 max-w-md">
                    Secure peer-to-peer transfer. Navigate to the send page to select and transfer
                    files.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-3 text-gray-500">
                    <span className="material-symbols-outlined text-bauhaus-blue text-3xl">
                      cloud_upload
                    </span>
                    <span className="text-sm">P2P encrypted transfer ready</span>
                  </div>
                  <Button className="relative overflow-hidden" size="lg">
                    <Link href="/send">
                      <span className="relative z-10">Go to Send</span>
                      <span className="material-symbols-outlined text-lg relative z-10">
                        arrow_forward
                      </span>
                      <Ripple color="rgba(0,0,0,0.2)" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Receive File Card */}
            <div className="bg-surface-elevated border-l-[8px] border-bauhaus-red p-8 rounded-r-sm hover:bg-surface-elevated interactive-card">
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                <div className="flex-1">
                  <h2 className="font-black text-2xl text-white mb-2 uppercase tracking-tight">
                    Receive File
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Enter the secure key provided by the sender to establish connection.
                  </p>
                </div>
                <div className="flex-1 w-full flex justify-end">
                  <Button
                    variant="outline"
                    className="relative overflow-hidden whitespace-nowrap"
                    size="lg"
                  >
                    <Link href="/receive">
                      <span className="relative z-10">Go to Receive</span>
                      <Ripple />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Stats) - Spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Total Transferred */}
            <div className="flex-1 bg-surface-elevated p-6 rounded-none border-t-4 border-primary relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Total Data Moved
                  </h3>
                  <span className="material-symbols-outlined text-primary">analytics</span>
                </div>
                <p
                  data-testid="data-moved-value"
                  className="font-black text-5xl text-white uppercase tracking-tight"
                >
                  {formatFileSize(totalShared)}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-green-400">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  <span>Total shared across all transfers</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
            </div>

            {/* Current Time */}
            <div className="flex-1 bg-surface-elevated p-6 rounded-none border-t-4 border-bauhaus-blue relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Local Time
                  </h3>
                  <span className="material-symbols-outlined text-bauhaus-blue">schedule</span>
                </div>
                <p className="font-black text-5xl text-white uppercase tracking-tight font-mono tabular-nums">
                  {formatTime()}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <span className="material-symbols-outlined text-sm">public</span>
                  <span>{getTimezone()}</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-bauhaus-blue/5 rounded-full blur-xl"></div>
            </div>

            {/* Admin Panel - Only show for admin users */}
            {user && <AdminQuickAccess userId={user.id} />}
          </div>

          {/* BOTTOM SECTION (Recent Activity) - Spans 12 cols */}
          <div className="lg:col-span-12 mt-4">
            <div className="flex items-end justify-between mb-6 border-b border-white/10 pb-2">
              <h3 className="font-black text-xl text-white uppercase tracking-tight">
                Recent Activity
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="relative overflow-hidden text-gray-400 hover:text-white"
              >
                <Link href="/history">
                  <span className="relative z-10">View All History</span>
                  <span className="material-symbols-outlined text-sm relative z-10">
                    arrow_right_alt
                  </span>
                  <Ripple />
                </Link>
              </Button>
            </div>
            <div className="bg-surface-elevated rounded-none overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-black/20 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5">
                <div className="col-span-5 md:col-span-4">Filename</div>
                <div className="col-span-3 md:col-span-2">Size</div>
                <div className="hidden md:block md:col-span-3">Created</div>
                <div className="col-span-4 md:col-span-3 text-right">Status</div>
              </div>

              {/* Transfer List */}
              {transfersLoading ? (
                <div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 animate-pulse"
                    >
                      <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                        <div className="size-10 bg-white/10 backdrop-blur-sm rounded-none" />
                        <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-32" />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <div className="h-3 bg-white/10 backdrop-blur-sm rounded w-16" />
                      </div>
                      <div className="hidden md:block md:col-span-3">
                        <div className="h-3 bg-white/10 backdrop-blur-sm rounded w-24" />
                      </div>
                      <div className="col-span-4 md:col-span-3 flex justify-end">
                        <div className="h-6 bg-white/10 backdrop-blur-sm rounded-full w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transfers.length === 0 ? (
                <div className="py-12 flex justify-center">
                  <EmptyState
                    title="No Transfers Yet"
                    description="Your transfer history is empty. Send a file to a peer or receive one to get started."
                    actionLabel="Send File"
                    actionLink="/send"
                    icon="swap_horiz"
                  />
                </div>
              ) : (
                transfers.slice(0, 5).map((transfer, idx) => {
                  const colorStrip =
                    idx % 3 === 0
                      ? "bg-primary"
                      : idx % 3 === 1
                        ? "bg-bauhaus-blue"
                        : "bg-bauhaus-red";
                  const hoverColor =
                    idx % 3 === 0
                      ? "group-hover:text-primary"
                      : idx % 3 === 1
                        ? "group-hover:text-bauhaus-blue"
                        : "group-hover:text-bauhaus-red";

                  const statusStyle =
                    STATUS_CONFIG[transfer.status as StatusConfigKey] || STATUS_CONFIG.cancelled;

                  return (
                    <div
                      key={transfer.id}
                      className="group grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors border-b border-white/5 relative"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorStrip}`}></div>
                      <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-none text-white">
                          <span className="material-symbols-outlined text-sm">description</span>
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-bold text-white ${hoverColor} transition-colors truncate`}
                          >
                            {transfer.filename}
                          </p>
                          <p className="text-xs text-gray-500 md:hidden">
                            {formatFileSize(transfer.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-3 md:col-span-2 text-sm text-gray-400">
                        {formatFileSize(transfer.file_size)}
                      </div>
                      <div className="hidden md:block md:col-span-3">
                        <span className="text-xs text-gray-400">
                          {new Date(transfer.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="col-span-4 md:col-span-3 flex justify-end gap-2">
                        <div
                          className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusStyle.bg} border ${statusStyle.border}`}
                        >
                          <span className={`material-symbols-outlined text-xs ${statusStyle.text}`}>
                            {statusStyle.icon}
                          </span>
                          <span className={`text-xs font-bold ${statusStyle.text} uppercase`}>
                            {transfer.status}
                          </span>
                        </div>
                        {confirmDeleteId === transfer.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(transfer.id)}
                              className="p-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all active:scale-90 rounded-none"
                              title="Confirm delete"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 text-gray-400 hover:text-white transition-all active:scale-90 rounded-none"
                              title="Cancel"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(transfer.id)}
                            className="p-1 text-gray-500 hover:text-red-400 transition-all active:scale-90 opacity-0 group-hover:opacity-100 rounded-none"
                            title="Delete transfer"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
