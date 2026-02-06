"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { getUserProfile } from "@/lib/services/profile-service";
import { useUserTransfersRealtime } from "@/lib/hooks/use-transfer-realtime";
import type { User } from "@supabase/supabase-js";
import { formatFileSize } from "@repo/utils";
import TransferDetailsModal from "@/components/transfer-details-modal";
import type { Transfer } from "@repo/types";
import Link from "next/link";

export default function HistoryPage() {
  const router = useRouter();
  const [_user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showClearAll, setShowClearAll] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [avatarIcon, setAvatarIcon] = useState("person");
  const [avatarColor, setAvatarColor] = useState({ value: "bg-primary", text: "text-black" });
  const { transfers, loading: transfersLoading, removeMultipleTransfers, refresh } = useUserTransfersRealtime();

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

    // Load user profile
    const profile = await getUserProfile();
    if (profile) {
      setAvatarIcon(profile.avatar_icon || "person");
      const colorMap: Record<string, { value: string; text: string }> = {
        "bg-primary": { value: "bg-primary", text: "text-black" },
        "bg-bauhaus-blue": { value: "bg-bauhaus-blue", text: "text-white" },
        "bg-bauhaus-red": { value: "bg-bauhaus-red", text: "text-white" },
        "bg-green-500": { value: "bg-green-500", text: "text-white" },
        "bg-purple-500": { value: "bg-purple-500", text: "text-white" },
        "bg-orange-500": { value: "bg-orange-500", text: "text-black" },
      };
      setAvatarColor(colorMap[profile.avatar_color || "bg-primary"] || { value: "bg-primary", text: "text-black" });
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  const filteredTransfers =
    filter === "all" ? transfers : transfers.filter((t) => t.status === filter);

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
      console.error("[HISTORY] Clear all failed:", err);
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



  return (
    <div className="min-h-screen flex flex-col font-display bg-transparent text-white relative overflow-x-hidden">
      {/* Navigation */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 border-b border-[#6b6644]/30 bg-[#1a1a1a] sticky top-0">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary flex items-center justify-center rounded-sm text-black">
            <span className="material-symbols-outlined text-[24px]">link</span>
          </div>
          <h1 className="font-black text-xl tracking-wider text-white uppercase">HyperLink</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="flex items-center justify-center size-10 rounded-sm bg-[#242424] hover:bg-[#2f2f2f] transition-all active:scale-95 text-white border border-white/5">
              <span className="material-symbols-outlined">dashboard</span>
            </button>
          </Link>
          <Link href="/settings">
            <button className="flex items-center justify-center size-10 rounded-sm bg-[#242424] hover:bg-[#2f2f2f] transition-all active:scale-95 text-white border border-white/5">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </Link>
          <div className={`size-10 rounded-full ${avatarColor.value} flex items-center justify-center border border-white/10 shadow-lg`}>
            <span className={`material-symbols-outlined text-xl ${avatarColor.text}`}>
              {avatarIcon}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-[-0.05em] leading-tight mb-2 text-white">
              Transfer History
            </h2>
            <p className="text-gray-400 max-w-lg font-normal">
              View and manage your past peer-to-peer file transfer logs. Secure, encrypted, and direct.
            </p>
          </div>

          {/* Filter Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all active:scale-95 ${filter === "all"
                ? "bg-primary text-black"
                : "bg-transparent border border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                }`}
            >
              All Transfers
            </button>
            <button
              onClick={() => setFilter("complete")}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all active:scale-95 ${filter === "complete"
                ? "bg-primary text-black"
                : "bg-transparent border border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter("failed")}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all active:scale-95 ${filter === "failed"
                ? "bg-primary text-black"
                : "bg-transparent border border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                }`}
            >
              Failed
            </button>

            {/* Clear All Button */}
            {deletableTransfers.length > 0 && (
              <div className="ml-auto">
                {showClearAll ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Clear {deletableTransfers.length} finished transfers?</span>
                    <button
                      onClick={handleClearAll}
                      className="px-3 py-1.5 text-xs font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/40 transition-all active:scale-95 rounded-sm"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowClearAll(false)}
                      className="px-3 py-1.5 text-xs font-bold uppercase text-gray-400 border border-white/10 hover:border-white/30 transition-all active:scale-95 rounded-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearAll(true)}
                    className="px-4 py-2 uppercase text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-95 flex items-center gap-1.5 rounded-sm"
                  >
                    <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="w-full overflow-x-auto border border-[#6b6644]/20 rounded-sm bg-[#1a1a1a] shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#6b6644] bg-[#121212]">
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest w-1/4">
                  File
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest w-[120px]">
                  Size
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
            <tbody className="divide-y divide-[#6b6644]/20">
              {transfersLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <span className="material-symbols-outlined text-6xl opacity-20">history</span>
                    <p className="mt-4 text-gray-500">No transfers found for this filter.</p>
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

                  const statusConfig = {
                    complete: {
                      bg: "bg-[#2E9AFE]/10",
                      border: "border-[#2E9AFE]/20",
                      text: "text-[#2E9AFE]",
                      icon: "check_circle",
                    },
                    failed: {
                      bg: "bg-[#FF4D4D]/10",
                      border: "border-[#FF4D4D]/20",
                      text: "text-[#FF4D4D]",
                      icon: "error",
                    },
                    transferring: {
                      bg: "bg-primary/10",
                      border: "border-primary/20",
                      text: "text-primary",
                      icon: "hourglass_top",
                    },
                    pending: {
                      bg: "bg-primary/10",
                      border: "border-primary/20",
                      text: "text-primary",
                      icon: "hourglass_top",
                    },
                  };

                  const style = statusConfig[transfer.status as keyof typeof statusConfig] || statusConfig.pending;

                  return (
                    <tr
                      key={transfer.id}
                      onClick={() => setSelectedTransfer(transfer)}
                      className="group border-l-[3px] border-l-transparent hover:border-l-primary hover:bg-[#222] transition-all duration-150 ease-out cursor-pointer"
                    >
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-gray-800 flex items-center justify-center rounded-sm text-gray-300 group-hover:text-primary group-hover:bg-black transition-colors">
                            <span className="material-symbols-outlined">{getFileIcon(transfer.filename)}</span>
                          </div>
                          <span className="font-bold text-white group-hover:text-primary transition-colors truncate max-w-[300px]">
                            {transfer.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6 font-mono text-sm text-gray-400">{formatFileSize(transfer.file_size)}</td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <div className={`size-6 ${peerColor.bg} rounded-full flex items-center justify-center text-[10px] font-bold ${peerColor.text}`}>
                            {peerLetter}
                          </div>
                          <span className="text-sm font-medium text-gray-300">Peer-{transfer.id.slice(0, 3).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${style.bg} ${style.text} text-[10px] font-black uppercase tracking-wider border ${style.border}`}>
                          <span className={`material-symbols-outlined text-[14px] ${transfer.status === "transferring" ? "animate-spin" : ""}`}>
                            {style.icon}
                          </span>
                          {transfer.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right font-mono text-sm text-gray-500 group-hover:text-white">
                        {new Date(transfer.created_at).toLocaleString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }).replace(",", "")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#6b6644]/20 py-8 text-center mt-auto">
        <p className="text-xs text-gray-600 uppercase tracking-widest">Encrypted. Decentralized. Direct.</p>
      </footer>

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
