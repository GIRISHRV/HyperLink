"use client";
import React from "react";

import { formatFileSize, formatTime } from "@repo/utils";
import { ProgressBar } from "@/components/progress-bar";

interface TransferProgressPanelProps {
  peerId: string;
  fileName: string;
  percentage: number;
  isPaused: boolean;
  pausedBy?: "local" | "remote";
  speed: number;
  timeRemaining: number;
  onPauseResume: () => void;
  onCancel: () => void;
  isWakeLockActive?: boolean;
  /** "uplink" for send, "downlink" for receive */
  direction: "uplink" | "downlink";
  chunkSize?: number;
  windowSize?: number;
}

export default function TransferProgressPanel({
  peerId,
  fileName,
  percentage,
  isPaused,
  pausedBy,
  speed,
  timeRemaining,
  onPauseResume,
  onCancel,
  direction,
  isWakeLockActive,
  chunkSize,
  windowSize,
}: TransferProgressPanelProps) {
  const isUplink = direction === "uplink";
  const [showDetails, setShowDetails] = React.useState(false);

  const getTurboLevel = (size?: number) => {
    if (!size) return null;
    if (size >= 1024 * 1024) return { label: "TURBO [ULTRA]", color: "text-primary" };
    if (size >= 512 * 1024) return { label: "TURBO [HIGH]", color: "text-amber-400" };
    if (size >= 256 * 1024) return { label: "TURBO [MED]", color: "text-blue-400" };
    return { label: "TURBO [LOW]", color: "text-white/40" };
  };

  const turbo = getTurboLevel(chunkSize);

  return (
    <div className="lg:col-span-5 flex flex-col gap-6 w-full overflow-hidden">
      {/* Secure Link Card */}
      <div className="bg-surface p-4 border-l-4 border-primary flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-12 h-12 ${isUplink ? "bg-surface-inset" : "bg-red-950/30"} rounded-full flex items-center justify-center border border-primary/30`}
            >
              <span className="material-symbols-outlined text-primary">
                {isUplink ? "hub" : "satellite_alt"}
              </span>
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-3 h-3 ${isUplink ? "bg-green-500" : "bg-bauhaus-blue"} border-2 border-surface rounded-full animate-pulse`}
            ></div>
          </div>
          <div>
            <p className="text-muted text-xs font-bold uppercase tracking-widest">
              {isUplink ? "Secure Uplink Established" : "Incoming Data Stream"}
            </p>
            <p className="text-white font-bold font-mono text-sm tracking-tight">
              ID: {peerId.slice(0, 8)}...{peerId.slice(-4)}
            </p>
          </div>
        </div>
        <span className={`material-symbols-outlined text-primary ${!isPaused && "animate-pulse"}`}>
          {isPaused ? "pause_circle" : isUplink ? "lock" : "downloading"}
        </span>
      </div>

      {/* Task #7: Wake Lock Indicator */}
      {isWakeLockActive && (
        <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3 flex items-center justify-between z-10 animate-in fade-in slide-in-from-left-2">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500 animate-pulse">coffee</span>
            <div>
              <p className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">
                System Stay-Awake Active
              </p>
              <p className="text-white/60 text-[10px] font-mono">
                Screen will remain on until transfer completes
              </p>
            </div>
          </div>
          <div className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black uppercase tracking-tighter rounded-sm">
            Active
          </div>
        </div>
      )}

      {/* Main Progress Card */}
      <div className="bg-surface-inset/90 backdrop-blur-sm p-6 border border-subtle-bauhaus flex-1 flex flex-col gap-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#3a3827_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

        <div className="flex justify-between items-start z-10">
          <div>
            <h3 className="text-white font-black uppercase text-xl tracking-tighter">
              {isUplink ? "Uploading Payload" : "Receiving Payload"}
            </h3>
            <p className="text-muted text-xs font-mono mt-1 truncate max-w-xs">{fileName}</p>
          </div>
          <div className="text-right">
            <span
              data-testid="progress"
              className="text-primary font-mono text-2xl font-bold block"
              aria-live="polite"
              aria-atomic="true"
            >
              {percentage.toFixed(0)}%
            </span>
            <span className="text-white/30 text-xs uppercase tracking-wider">
              {isUplink ? "Completion" : "Integrity"}
            </span>
          </div>
        </div>

        {/* Dynamic Chunking Indicator (Task #8) */}
        {turbo && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 w-fit rounded-full -mt-2 animate-in fade-in slide-in-from-top-1">
            <span className={`material-symbols-outlined text-sm ${turbo.color} animate-pulse`}>
              rocket_launch
            </span>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${turbo.color}`}>
              {turbo.label}
            </span>
            <div className="w-[1px] h-3 bg-white/10 mx-1" />
            <span className="text-[10px] text-white/40 font-mono">
              {formatFileSize(chunkSize || 0)}/chunk
            </span>
          </div>
        )}

        <ProgressBar
          percentage={percentage}
          isPaused={isPaused}
          speed={speed}
          formatFileSize={formatFileSize}
          formatTime={formatTime}
          timeRemaining={timeRemaining}
        />

        <div className="grid grid-cols-2 gap-3 mt-auto z-10">
          <button
            onClick={onPauseResume}
            disabled={isPaused && pausedBy === "remote"}
            className={`h-12 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] border ${
              isPaused && pausedBy === "remote"
                ? "bg-surface text-muted border-subtle-bauhaus cursor-not-allowed"
                : isPaused
                  ? "bg-primary text-black border-primary hover:bg-white"
                  : "bg-transparent text-white border-white/20 hover:border-white hover:bg-white/5"
            }`}
          >
            {isPaused && pausedBy === "remote" ? (
              <span className="material-symbols-outlined !text-[18px]">pause_circle</span>
            ) : (
              <span className="material-symbols-outlined !text-[18px]">
                {isPaused ? "play_arrow" : "pause"}
              </span>
            )}
            {isPaused
              ? pausedBy === "remote"
                ? "Paused by Peer"
                : isUplink
                  ? "Resume Uplink"
                  : "RESUME DOWNLINK"
              : isUplink
                ? "Pause"
                : "Halt"}
          </button>
          <button
            onClick={onCancel}
            className="h-12 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined !text-[18px]">block</span>
            Abort
          </button>
        </div>

        {/* Technical Details Toggle (Task #8) */}
        <div className="z-10 mt-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white/50 flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">
              {showDetails ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            </span>
            Technical Diagnostics
          </button>

          {showDetails && (
            <div className="mt-3 grid grid-cols-2 gap-4 p-4 bg-black/40 border border-white/5 rounded-sm animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                  Pipe Capacity
                </p>
                <p className="text-xs font-mono text-primary">{formatFileSize(chunkSize || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                  Congestion Window
                </p>
                <p className="text-xs font-mono text-blue-400">{windowSize || 0} chunks</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                  Protocol
                </p>
                <p className="text-xs font-mono text-white/60">WebRTC/SCTP</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                  Encapsulation
                </p>
                <p className="text-xs font-mono text-white/60">AES-GCM-256</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
