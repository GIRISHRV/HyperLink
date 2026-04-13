"use client";

import { useState, useEffect } from "react";
import { useUserTransfersRealtime } from "@/lib/hooks/use-transfer-realtime";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { formatFileSize, STATUS_CONFIG, logger } from "@repo/utils";
import type { StatusConfigKey } from "@repo/utils";
import TransferDetailsModal from "@/components/transfer-details-modal";
import { DataMovedCard } from "@/components/stats/data-moved-card";
import EmptyState from "@/components/empty-state";
import { Ripple } from "@/components/ripple";
import type { Transfer } from "@repo/types";
import AppHeader from "@/components/app-header";
import { ListSkeleton, TableRowSkeleton } from "@/components/skeletons";

export default function HistoryPage() {
  const [filter, setFilter] = useState<string>("all");
  const [showClearAll, setShowClearAll] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  const {
    transfers,
    loading: transfersLoading,
    removeMultipleTransfers,
    refresh,
    loadMore,
    hasMore,
  } = useUserTransfersRealtime(20);

  const { user, loading } = useRequireAuth();

  useEffect(() => {
    // App Badging API - Clear badge when entering history
    if ("clearAppBadge" in navigator) {
      navigator
        .clearAppBadge()
        .catch((e: unknown) => logger.error({ e }, "[HISTORY] clearAppBadge failed:"));
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 lg:p-12 animate-reveal relative overflow-hidden flex flex-col">
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full">
          <header className="flex items-center justify-between mb-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-3 animate-pulse">
              <div className="size-8 bg-white/10 rounded-md" />
              <div className="h-6 bg-white/10 rounded-full w-32" />
            </div>
            <div className="flex items-center gap-3 animate-pulse">
              <div className="size-10 bg-white/10 rounded-md" />
              <div className="size-10 bg-white/10 rounded-md" />
              <div className="size-10 bg-white/10 rounded-full" />
            </div>
          </header>
          <main className="flex-grow w-full">
            <div className="mb-10 animate-pulse rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-6">
              <div className="h-10 bg-white/10 rounded-lg w-64 mb-4" />
              <div className="h-4 bg-white/10 rounded-full w-96 max-w-full" />
            </div>
            <ListSkeleton />
          </main>
        </div>
      </div>
    );
  }

  const filteredTransfers = transfers.filter((t) => {
    if (filter === "all") return true;
    if (filter === "sent") return user && t.sender_id === user.id;
    if (filter === "received") return user && t.receiver_id === user.id;
    return t.status === filter;
  });

  const deletableTransfers = transfers.filter(
    (t) => t.status === "complete" || t.status === "failed" || t.status === "cancelled"
  );

  async function handleClearAll() {
    const ids = deletableTransfers.map((t) => t.id);
    if (ids.length === 0) {
      setShowClearAll(false);
      return;
    }
    try {
      await removeMultipleTransfers(ids);
    } catch (err) {
      logger.error({ err }, "[HISTORY] Clear all failed:");
    }
    setShowClearAll(false);
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      zip: "folder_zip",
      rar: "folder_zip",
      "7z": "folder_zip",
      pdf: "picture_as_pdf",
      doc: "description",
      docx: "description",
      txt: "description",
      xlsx: "grid_on",
      xls: "grid_on",
      csv: "grid_on",
      mp4: "movie",
      avi: "movie",
      mkv: "movie",
      mov: "movie",
      jpg: "image",
      jpeg: "image",
      png: "image",
      gif: "image",
      mp3: "audio_file",
      wav: "audio_file",
    };
    return iconMap[ext || ""] || "insert_drive_file";
  };

  const getDirectionMeta = (transfer: Transfer) => {
    if (transfer.sender_id === user?.id) {
      return {
        label: "Sent",
        badgeClass:
          "inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs font-black uppercase tracking-wider border border-blue-500/30",
        icon: "upload",
      };
    }

    return {
      label: "Received",
      badgeClass:
        "inline-flex items-center gap-1.5 px-2 py-1 rounded bg-purple-900/30 text-purple-400 text-xs font-black uppercase tracking-wider border border-purple-500/30",
      icon: "download",
    };
  };

  const formatTransferDateTime = (value: string) =>
    new Date(value)
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "");

  return (
    <div className="min-h-screen flex flex-col font-display bg-transparent text-white relative overflow-x-hidden animate-reveal">
      {/* Navigation */}
      <AppHeader variant="app" />

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-10">
        {/* Stats Section */}
        <div className="mb-8">
          <DataMovedCard userId={user?.id || ""} />
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-[-0.05em] leading-tight mb-2 text-white">
              Transfer History
            </h2>
            <p className="text-gray-400 max-w-lg font-normal">
              View and manage your past peer-to-peer file transfer logs. Secure, encrypted, and
              direct.
            </p>
          </div>

          {/* Filter Actions */}
          <div className="w-full md:w-auto flex flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setFilter("all")}
                className={`shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all active:scale-95 relative overflow-hidden ${
                  filter === "all"
                    ? "bg-primary text-black"
                    : "bg-transparent border border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                }`}
              >
                <span className="relative z-10">All Transfers</span>
                <Ripple color={filter === "all" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"} />
              </button>

              <button
                onClick={() => setFilter("sent")}
                className={`shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all active:scale-95 relative overflow-hidden ${
                  filter === "sent"
                    ? "bg-primary text-black"
                    : "bg-transparent border border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                }`}
              >
                <span className="relative z-10">Sent</span>
                <Ripple color={filter === "sent" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"} />
              </button>

              <button
                onClick={() => setFilter("received")}
                className={`shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all active:scale-95 relative overflow-hidden ${
                  filter === "received"
                    ? "bg-primary text-black"
                    : "bg-transparent border border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                }`}
              >
                <span className="relative z-10">Received</span>
                <Ripple
                  color={filter === "received" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"}
                />
              </button>

              <button
                onClick={() => setFilter("complete")}
                className={`shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all active:scale-95 relative overflow-hidden ${
                  filter === "complete"
                    ? "bg-primary text-black"
                    : "bg-transparent border border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                }`}
              >
                <span className="relative z-10">Completed</span>
                <Ripple
                  color={filter === "complete" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"}
                />
              </button>

              <button
                onClick={() => setFilter("failed")}
                className={`shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all active:scale-95 relative overflow-hidden ${
                  filter === "failed"
                    ? "bg-primary text-black"
                    : "bg-transparent border border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                }`}
              >
                <span className="relative z-10">Failed</span>
                <Ripple color={filter === "failed" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"} />
              </button>
            </div>

            {/* Clear All Button */}
            {deletableTransfers.length > 0 && (
              <div className="w-full md:flex md:justify-end">
                {showClearAll ? (
                  <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-xs text-gray-400 md:whitespace-nowrap">
                      Clear {deletableTransfers.length} finished transfers?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleClearAll}
                        className="px-3 py-1.5 text-xs font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/40 transition-all active:scale-95 rounded-none relative overflow-hidden"
                      >
                        <span className="relative z-10">Confirm</span>
                        <Ripple color="rgba(239, 68, 68, 0.3)" />
                      </button>
                      <button
                        onClick={() => setShowClearAll(false)}
                        className="px-3 py-1.5 text-xs font-bold uppercase text-gray-400 border border-white/10 hover:border-white/30 transition-all active:scale-95 rounded-none relative overflow-hidden"
                      >
                        <span className="relative z-10">Cancel</span>
                        <Ripple />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearAll(true)}
                    className="w-full md:w-auto px-4 py-2 uppercase text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 rounded-none relative overflow-hidden"
                  >
                    <span className="material-symbols-outlined text-sm relative z-10">
                      delete_sweep
                    </span>
                    <span className="relative z-10">Clear All</span>
                    <Ripple color="rgba(239, 68, 68, 0.3)" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile List */}
        <div className="md:hidden space-y-3">
          {transfersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-lg bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 rounded-full bg-white/10" />
                      <div className="h-3 w-1/3 rounded-full bg-white/5" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-white/10" />
                  </div>
                  <div className="h-3 w-1/2 rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="py-8">
              <EmptyState
                title="No Transfers Found"
                description={
                  filter === "all"
                    ? "No transfers yet. Start by sending one file to verify your setup."
                    : `No ${filter} transfers yet. Clear filters or start a new transfer.`
                }
                actionLabel="Start New Transfer"
                actionLink="/send"
                icon="youtube_searched_for"
              />
            </div>
          ) : (
            filteredTransfers.map((transfer) => {
              const style =
                STATUS_CONFIG[transfer.status as StatusConfigKey] || STATUS_CONFIG.pending;
              const direction = getDirectionMeta(transfer);

              return (
                <button
                  key={transfer.id}
                  onClick={() => setSelectedTransfer(transfer)}
                  className="w-full text-left rounded-xl border border-white/10 bg-surface-elevated p-4 transition-colors hover:border-primary/40 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-11 rounded-lg bg-white/10 flex items-center justify-center text-gray-200 shrink-0">
                      <span className="material-symbols-outlined not-italic leading-none text-[20px]">
                        {getFileIcon(transfer.filename)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate">{transfer.filename}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatFileSize(transfer.file_size)} • {direction.label}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${style.bg} ${style.text} text-[10px] font-black uppercase tracking-wider border ${style.border}`}
                    >
                      <span
                        className={`material-symbols-outlined not-italic leading-none text-[13px] ${transfer.status === "transferring" ? "animate-spin" : ""}`}
                      >
                        {style.icon}
                      </span>
                      {transfer.status}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500 shrink-0">
                      {formatTransferDateTime(transfer.created_at)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block w-full overflow-x-auto border border-white/10 rounded-none bg-white/5 backdrop-blur-md shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest w-1/4">
                  File
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest w-[120px]">
                  Size
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest w-[120px]">
                  Direction
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest w-[180px]">
                  Peer
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest w-[140px]">
                  Status
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transfersLoading ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <div className="flex justify-center">
                      <EmptyState
                        title="No Transfers Found"
                        description={
                          filter === "all"
                            ? "No transfers yet. Start by sending one file to verify your setup."
                            : `No ${filter} transfers yet. Clear filters or start a new transfer.`
                        }
                        actionLabel="Start New Transfer"
                        actionLink="/send"
                        icon="youtube_searched_for"
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((transfer, index) => {
                  const peerLetter = transfer.id.charAt(0).toUpperCase();
                  const peerColors = [
                    { bg: "bg-blue-900/50", text: "text-blue-200" },
                    { bg: "bg-yellow-900/50", text: "text-yellow-200" },
                    { bg: "bg-red-900/50", text: "text-red-200" },
                    { bg: "bg-green-900/50", text: "text-green-200" },
                    { bg: "bg-purple-900/50", text: "text-purple-200" },
                  ];
                  const peerColor = peerColors[index % peerColors.length];

                  const style =
                    STATUS_CONFIG[transfer.status as StatusConfigKey] || STATUS_CONFIG.pending;
                  const direction = getDirectionMeta(transfer);

                  return (
                    <tr
                      key={transfer.id}
                      onClick={() => setSelectedTransfer(transfer)}
                      className="group border-l-[3px] border-l-transparent hover:border-l-primary hover:bg-surface-elevated transition-all duration-150 ease-out cursor-pointer"
                    >
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-white/10 backdrop-blur-sm flex items-center justify-center rounded-none text-gray-300 group-hover:text-primary group-hover:bg-white/10 backdrop-blur-sm transition-colors">
                            <span className="material-symbols-outlined not-italic leading-none text-[18px]">
                              {getFileIcon(transfer.filename)}
                            </span>
                          </div>
                          <span className="font-bold text-white group-hover:text-primary transition-colors truncate max-w-[300px]">
                            {transfer.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6 font-mono text-sm text-gray-400">
                        {formatFileSize(transfer.file_size)}
                      </td>
                      <td className="py-5 px-6">
                        <span className={direction.badgeClass}>
                          <span className="material-symbols-outlined not-italic leading-none text-[14px]">
                            {direction.icon}
                          </span>
                          {direction.label}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <div
                            className={`size-6 ${peerColor.bg} rounded-full flex items-center justify-center text-xs font-bold ${peerColor.text}`}
                          >
                            {peerLetter}
                          </div>
                          <span className="text-sm font-medium text-gray-300">
                            Peer-{transfer.id.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${style.bg} ${style.text} text-xs font-black uppercase tracking-wider border ${style.border}`}
                          >
                            <span
                              className={`material-symbols-outlined not-italic leading-none text-[14px] ${transfer.status === "transferring" ? "animate-spin" : ""}`}
                            >
                              {style.icon}
                            </span>
                            {transfer.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right font-mono text-sm text-gray-500 group-hover:text-white">
                        {formatTransferDateTime(transfer.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {hasMore && !transfersLoading && filteredTransfers.length > 0 && filter === "all" && (
          <div className="mt-4 p-4 border border-white/10 flex justify-center bg-white/5 backdrop-blur-md">
            <button
              onClick={() => loadMore()}
              className="px-8 py-3 bg-surface border border-white/20 text-white text-xs font-bold uppercase tracking-wider hover:border-primary hover:text-primary transition-colors flex items-center gap-2 rounded-none active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined not-italic leading-none text-[18px]">
                expand_more
              </span>
              Load More Archive
              <Ripple />
            </button>
          </div>
        )}
      </main>

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <TransferDetailsModal
          transfer={selectedTransfer}
          isOpen={true}
          onClose={() => setSelectedTransfer(null)}
          onUpdate={() => refresh()}
        />
      )}
    </div>
  );
}
