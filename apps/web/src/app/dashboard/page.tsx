"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { getUserProfile } from "@/lib/services/profile-service";
import { useUserTransfersRealtime } from "@/lib/hooks/use-transfer-realtime";
import type { User } from "@supabase/supabase-js";
import { formatFileSize } from "@repo/utils";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [avatarIcon, setAvatarIcon] = useState("person");
  const [avatarColor, setAvatarColor] = useState({ value: "bg-primary", text: "text-black" });
  const { transfers, loading: transfersLoading, removeTransfer } = useUserTransfersRealtime();

  useEffect(() => {
    checkUser();

    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function checkUser() {
    try {
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
    } catch (e) {
      console.error("Auth check failed:", e);
      router.push("/auth");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  const totalShared = transfers.reduce((acc, t) => acc + (t.file_size || 0), 0);

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone.split('/').pop() || timezone;
  };

  async function handleDelete(transferId: string) {
    await removeTransfer(transferId);
    setConfirmDeleteId(null);
  }

  return (
    <div className="min-h-screen flex flex-col font-display bg-[#1a1a1a] relative overflow-x-hidden selection:bg-primary selection:text-black">
      {/* Geometric Background Decorations */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full border border-white/5"></div>
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full border border-primary/10"></div>
        <div className="absolute bottom-0 left-0 w-0 h-0 border-b-[300px] border-l-[300px] border-b-transparent border-l-[#242424]/20"></div>
      </div>

      {/* Navigation */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#1a1a1a]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary flex items-center justify-center rounded-sm text-black">
            <span className="material-symbols-outlined text-[24px]">link</span>
          </div>
          <h1 className="font-black text-xl tracking-wider text-white uppercase">HyperLink</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#242424] rounded-sm border border-white/5">
            <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-gray-400 tracking-wider">NODE ACTIVE</span>
            {user && <span className="text-xs font-mono text-white ml-2">• {user.email}</span>}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <button className="flex items-center justify-center size-10 rounded-sm bg-[#242424] hover:bg-[#2f2f2f] transition-colors text-white border border-white/5">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </Link>
            <div className={`size-10 rounded-full ${avatarColor.value} flex items-center justify-center border border-white/10 shadow-lg`}>
              <span className={`material-symbols-outlined text-xl ${avatarColor.text}`}>
                {avatarIcon}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-8 lg:p-12">
        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT COLUMN (Actions) - Spans 8 cols */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Send File Card */}
            <div className="group relative bg-[#242424] border-l-[8px] border-bauhaus-blue p-8 md:p-10 rounded-r-sm overflow-hidden hover:bg-[#2f2f2f] transition-all duration-300">
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[120px]">upload_file</span>
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div>
                  <h2 className="font-black text-3xl md:text-4xl text-white mb-2 uppercase tracking-tight">Send File</h2>
                  <p className="text-gray-400 max-w-md">Secure peer-to-peer transfer. Navigate to the send page to select and transfer files.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-3 text-gray-500">
                    <span className="material-symbols-outlined text-bauhaus-blue text-3xl">cloud_upload</span>
                    <span className="text-sm">P2P encrypted transfer ready</span>
                  </div>
                  <Link href="/send">
                    <button className="bg-primary hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-sm uppercase tracking-wider text-sm flex items-center gap-2 transition-transform active:scale-95">
                      <span>Go to Send</span>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Receive File Card */}
            <div className="bg-[#242424] border-l-[8px] border-bauhaus-red p-8 rounded-r-sm hover:bg-[#2f2f2f] transition-all duration-300">
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                <div className="flex-1">
                  <h2 className="font-black text-2xl text-white mb-2 uppercase tracking-tight">Receive File</h2>
                  <p className="text-gray-400 text-sm">Enter the secure key provided by the sender to establish connection.</p>
                </div>
                <div className="flex-1 w-full flex justify-end">
                  <Link href="/receive">
                    <button className="bg-[#242424] border border-white/20 hover:border-white/60 text-white font-bold py-3 px-6 rounded-sm uppercase tracking-wider text-sm whitespace-nowrap transition-colors">
                      Go to Receive
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Stats) - Spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Total Transferred */}
            <div className="flex-1 bg-[#242424] p-6 rounded-sm border-t-4 border-primary relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lifetime Data</h3>
                  <span className="material-symbols-outlined text-primary">analytics</span>
                </div>
                <p className="font-black text-5xl text-white uppercase tracking-tight">
                  {(totalShared / 1e9).toFixed(1)} <span className="text-2xl text-gray-500 font-normal ml-1">GB</span>
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-green-400">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  <span>Total shared across all transfers</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
            </div>

            {/* Current Time */}
            <div className="flex-1 bg-[#242424] p-6 rounded-sm border-t-4 border-bauhaus-blue relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Local Time</h3>
                  <span className="material-symbols-outlined text-bauhaus-blue">schedule</span>
                </div>
                <p className="font-black text-5xl text-white uppercase tracking-tight font-mono tabular-nums">{formatTime()}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <span className="material-symbols-outlined text-sm">public</span>
                  <span>{getTimezone()}</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-bauhaus-blue/5 rounded-full blur-xl"></div>
            </div>
          </div>

          {/* BOTTOM SECTION (Recent Activity) - Spans 12 cols */}
          <div className="lg:col-span-12 mt-4">
            <div className="flex items-end justify-between mb-6 border-b border-white/10 pb-2">
              <h3 className="font-black text-xl text-white uppercase tracking-tight">Recent Activity</h3>
              <Link href="/history">
                <button className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1">
                  View All History
                  <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                </button>
              </Link>
            </div>
            <div className="bg-[#242424] rounded-sm overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-black/20 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5">
                <div className="col-span-5 md:col-span-4">Filename</div>
                <div className="col-span-3 md:col-span-2">Size</div>
                <div className="hidden md:block md:col-span-3">Created</div>
                <div className="col-span-4 md:col-span-3 text-right">Status</div>
              </div>

              {/* Transfer List */}
              {transfersLoading ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                </div>
              ) : transfers.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <span className="material-symbols-outlined text-6xl opacity-20">upload</span>
                  <p className="mt-4">No transfers yet. Start by sending or receiving a file!</p>
                </div>
              ) : (
                transfers.slice(0, 5).map((transfer, idx) => {
                  const colorStrip = idx % 3 === 0 ? 'bg-primary' : idx % 3 === 1 ? 'bg-bauhaus-blue' : 'bg-bauhaus-red';
                  const hoverColor = idx % 3 === 0 ? 'group-hover:text-primary' : idx % 3 === 1 ? 'group-hover:text-bauhaus-blue' : 'group-hover:text-bauhaus-red';

                  const statusColors = {
                    complete: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500', dot: 'bg-green-500' },
                    transferring: { bg: 'bg-bauhaus-blue/10', border: 'border-bauhaus-blue/20', text: 'text-bauhaus-blue', dot: 'bg-bauhaus-blue' },
                    failed: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500', dot: 'bg-red-500' },
                    cancelled: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-400' },
                  };

                  const statusStyle = statusColors[transfer.status as keyof typeof statusColors] || statusColors.cancelled;

                  return (
                    <div key={transfer.id} className="group grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors border-b border-white/5 relative">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorStrip}`}></div>
                      <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-sm text-white">
                          <span className="material-symbols-outlined text-sm">description</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold text-white ${hoverColor} transition-colors truncate`}>{transfer.filename}</p>
                          <p className="text-xs text-gray-500 md:hidden">{formatFileSize(transfer.file_size)}</p>
                        </div>
                      </div>
                      <div className="col-span-3 md:col-span-2 text-sm text-gray-400">{formatFileSize(transfer.file_size)}</div>
                      <div className="hidden md:block md:col-span-3">
                        <span className="text-xs text-gray-400">{new Date(transfer.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="col-span-4 md:col-span-3 flex justify-end gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusStyle.bg} border ${statusStyle.border}`}>
                          <div className={`size-1.5 rounded-full ${statusStyle.dot}`}></div>
                          <span className={`text-xs font-bold ${statusStyle.text} uppercase`}>{transfer.status}</span>
                        </div>
                        {confirmDeleteId === transfer.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(transfer.id)}
                              className="p-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors rounded-sm"
                              title="Confirm delete"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 text-gray-400 hover:text-white transition-colors rounded-sm"
                              title="Cancel"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(transfer.id)}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 rounded-sm"
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
