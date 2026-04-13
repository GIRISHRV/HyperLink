"use client";

import { useState } from "react";
import { useUserTransfersRealtime } from "@/lib/hooks/use-transfer-realtime";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import EmptyState from "@/components/empty-state";
import { Ripple } from "@/components/ripple";
import { Button } from "@/components/ui/button";
import { formatFileSize, STATUS_CONFIG } from "@repo/utils";
import type { StatusConfigKey } from "@repo/utils";
import AppHeader from "@/components/app-header";
import Link from "next/link";
import { useAdminStatus } from "@/lib/hooks/use-admin-status";

function AdminQuickAccess({ userId }: { userId: string }) {
  const { isAdmin, loading } = useAdminStatus(userId);

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="rounded-xl bg-surface-elevated p-6 border border-white/10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.14em]">
            Administration
          </h3>
          <span className="material-symbols-outlined text-bauhaus-blue">security</span>
        </div>
        <div className="space-y-3">
          <Link
            href="/admin"
            className="block w-full bg-bauhaus-blue/10 hover:bg-bauhaus-blue/20 border border-bauhaus-blue/30 hover:border-bauhaus-blue text-bauhaus-blue font-bold py-2 px-3 transition-all text-xs uppercase tracking-wider text-center rounded-lg"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/admin/incidents"
            className="block w-full bg-bauhaus-red/10 hover:bg-bauhaus-red/20 border border-bauhaus-red/30 hover:border-bauhaus-red text-bauhaus-red font-bold py-2 px-3 transition-all text-xs uppercase tracking-wider text-center rounded-lg"
          >
            Manage Incidents
          </Link>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-bauhaus-blue/10 rounded-full blur-xl"></div>
    </div>
  );
}

export default function DashboardPage() {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { transfers, loading: transfersLoading, removeTransfer } = useUserTransfersRealtime();
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 lg:p-12 animate-reveal relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 animate-pulse">
          <div className="h-10 w-72 rounded-lg bg-white/10 mb-3" />
          <div className="h-4 w-[28rem] max-w-full rounded-full bg-white/5 mb-8" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[1, 2].map((card) => (
              <div key={card} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="h-3 w-24 rounded-full bg-white/10 mb-4" />
                <div className="h-10 w-20 rounded-lg bg-white/10 mb-3" />
                <div className="h-3 w-36 rounded-full bg-white/5" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="h-48 rounded-xl border border-white/10 bg-white/5" />
            <div className="h-48 rounded-xl border border-white/10 bg-white/5" />
          </div>

          <div className="h-[360px] rounded-xl border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  const sortedTransfers = [...transfers].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const recentTransfers = sortedTransfers.slice(0, 5);
  const totalShared = sortedTransfers.reduce((acc, t) => acc + (t.file_size || 0), 0);
  const completedTransfers = sortedTransfers.filter((t) => t.status === "complete").length;

  async function handleDelete(transferId: string) {
    await removeTransfer(transferId);
    setConfirmDeleteId(null);
  }

  return (
    <div className="min-h-screen flex flex-col font-display bg-transparent relative overflow-x-hidden selection:bg-primary selection:text-black animate-reveal">
      <AppHeader variant="app" />

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 lg:p-12">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
                Dashboard
              </h1>
              <p className="text-sm text-gray-400 mt-1 max-w-xl">
                Quick transfer actions and the stats that actually matter.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="rounded-lg" asChild>
                <Link href="/send">Send File</Link>
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" asChild>
                <Link href="/receive">Receive File</Link>
              </Button>
            </div>
          </section>

          <section
            data-testid="dashboard-operations-strip"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="rounded-xl bg-surface-elevated border border-white/10 p-5 relative overflow-hidden">
              <div className="flex items-start justify-between mb-2">
                <p
                  data-testid="data-moved-label"
                  className="text-[11px] font-bold text-gray-500 uppercase tracking-widest"
                >
                  Total Data Moved
                </p>
                <span className="material-symbols-outlined text-primary text-sm">analytics</span>
              </div>
              <p
                data-testid="data-moved-value"
                className="text-4xl font-black text-white tracking-tight"
              >
                {formatFileSize(totalShared)}
              </p>
              <p className="text-xs text-gray-400 mt-2">Across all authenticated transfers</p>
            </div>

            <div className="rounded-xl bg-surface-elevated border border-white/10 p-5 relative overflow-hidden">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                Completed Transfers
              </p>
              <p className="text-4xl font-black text-white tracking-tight">{completedTransfers}</p>
              <p className="text-xs text-gray-400 mt-2">
                Successfully finished end-to-end transfers
              </p>
            </div>
          </section>

          <section
            data-testid="dashboard-action-grid"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div
              data-testid="dashboard-send-action"
              className="group relative rounded-xl bg-surface-elevated border border-bauhaus-blue/35 p-8 md:p-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[120px]">upload_file</span>
              </div>
              <div className="relative z-10 flex flex-col gap-6">
                <div>
                  <h2 className="font-black text-3xl md:text-4xl text-white mb-2 uppercase tracking-tight">
                    Send File
                  </h2>
                  <p className="text-gray-400 max-w-md">
                    Start a secure peer-to-peer session and push files directly with end-to-end
                    encryption.
                  </p>
                </div>
                <Button className="relative overflow-hidden self-start" size="lg" asChild>
                  <Link href="/send">
                    <span className="relative z-10">Launch Sender</span>
                    <span className="material-symbols-outlined text-lg relative z-10">
                      arrow_forward
                    </span>
                    <Ripple color="rgba(0,0,0,0.2)" />
                  </Link>
                </Button>
              </div>
            </div>

            <div
              data-testid="dashboard-receive-action"
              className="group relative rounded-xl bg-surface-elevated border border-bauhaus-red/35 p-8 md:p-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[120px]">download</span>
              </div>
              <div className="relative z-10 flex flex-col gap-6">
                <div>
                  <h2 className="font-black text-3xl md:text-4xl text-white mb-2 uppercase tracking-tight">
                    Receive File
                  </h2>
                  <p className="text-gray-400 max-w-md">
                    Open your secure inbox, share your receiver code, and accept trusted incoming
                    transfers.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="relative overflow-hidden self-start"
                  size="lg"
                  asChild
                >
                  <Link href="/receive">
                    <span className="relative z-10">Open Receiver</span>
                    <Ripple />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between mb-4 border-b border-white/10 pb-2">
              <h3 className="font-black text-xl text-white uppercase tracking-tight">
                Recent Activity
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="relative overflow-hidden text-gray-400 hover:text-white"
                asChild
              >
                <Link href="/history" data-testid="view-all-history-button">
                  <span className="relative z-10">View All History</span>
                  <span className="material-symbols-outlined text-sm relative z-10">
                    arrow_right_alt
                  </span>
                  <Ripple />
                </Link>
              </Button>
            </div>

            <div className="bg-surface-elevated rounded-xl overflow-hidden border border-white/10">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-black/20 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5">
                <div className="col-span-5 md:col-span-4">Filename</div>
                <div className="col-span-2 md:col-span-2">Size</div>
                <div className="hidden md:block md:col-span-3">Created</div>
                <div className="col-span-5 md:col-span-3 text-right">Status</div>
              </div>

              {transfersLoading ? (
                <div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 animate-pulse"
                    >
                      <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                        <div className="size-10 bg-white/10 rounded-lg" />
                        <div className="h-4 bg-white/10 rounded-full w-32" />
                      </div>
                      <div className="col-span-2 md:col-span-2">
                        <div className="h-3 bg-white/10 rounded-full w-16" />
                      </div>
                      <div className="hidden md:block md:col-span-3">
                        <div className="h-3 bg-white/10 rounded-full w-24" />
                      </div>
                      <div className="col-span-5 md:col-span-3 flex justify-end">
                        <div className="h-6 bg-white/10 rounded-full w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedTransfers.length === 0 ? (
                <div className="py-12 flex justify-center">
                  <EmptyState
                    title="No Transfers Yet"
                    description="Start your first transfer now. Send a file to a trusted peer and return here to track results."
                    actionLabel="Start First Transfer"
                    actionLink="/send"
                    icon="swap_horiz"
                  />
                </div>
              ) : (
                recentTransfers.map((transfer, idx) => {
                  const colorStrip =
                    idx % 3 === 0
                      ? "bg-primary"
                      : idx % 3 === 1
                        ? "bg-bauhaus-blue"
                        : "bg-bauhaus-red";
                  const statusStyle =
                    STATUS_CONFIG[transfer.status as StatusConfigKey] || STATUS_CONFIG.cancelled;
                  const mobileStatusLabel =
                    transfer.status === "cancelled"
                      ? "cancel"
                      : transfer.status === "transferring"
                        ? "live"
                        : transfer.status;

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
                          <p className="text-sm font-bold text-white truncate">
                            {transfer.filename}
                          </p>
                          <p className="text-xs text-gray-500 md:hidden">
                            {formatFileSize(transfer.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2 md:col-span-2 text-xs md:text-sm text-gray-400 whitespace-nowrap">
                        {formatFileSize(transfer.file_size)}
                      </div>
                      <div className="hidden md:block md:col-span-3">
                        <span className="text-xs text-gray-400">
                          {new Date(transfer.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="col-span-5 md:col-span-3 flex justify-end items-center gap-2 min-w-0">
                        <div
                          className={`inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-full ${statusStyle.bg} border ${statusStyle.border} max-w-full`}
                        >
                          <span className={`material-symbols-outlined text-xs ${statusStyle.text}`}>
                            {statusStyle.icon}
                          </span>
                          <span
                            className={`hidden md:inline text-xs font-bold ${statusStyle.text} uppercase`}
                          >
                            {transfer.status}
                          </span>
                          <span
                            className={`md:hidden text-[10px] font-bold ${statusStyle.text} uppercase`}
                          >
                            {mobileStatusLabel}
                          </span>
                        </div>
                        {confirmDeleteId === transfer.id ? (
                          <div className="hidden md:flex items-center gap-1">
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
                            className="hidden md:block p-1 text-gray-500 hover:text-red-400 transition-all active:scale-90 opacity-0 group-hover:opacity-100 rounded-none"
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
          </section>

          {user && (
            <section className="max-w-md">
              <AdminQuickAccess userId={user.id} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
