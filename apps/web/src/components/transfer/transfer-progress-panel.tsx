"use client";

import { formatFileSize, formatTime } from "@repo/utils";
import { ProgressBar } from "@/components/progress-bar";

interface TransferProgressPanelProps {
  peerId: string;
  fileName: string;
  percentage: number;
  isPaused: boolean;
  speed: number;
  timeRemaining: number;
  onPauseResume: () => void;
  onCancel: () => void;
  /** "uplink" for send, "downlink" for receive */
  direction: "uplink" | "downlink";
}

export default function TransferProgressPanel({
  peerId,
  fileName,
  percentage,
  isPaused,
  speed,
  timeRemaining,
  onPauseResume,
  onCancel,
  direction,
}: TransferProgressPanelProps) {
  const isUplink = direction === "uplink";

  return (
    <div className="lg:col-span-5 flex flex-col gap-6">
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
              {isUplink
                ? "Secure Uplink Established"
                : "Incoming Data Stream"}
            </p>
            <p className="text-white font-bold font-mono text-sm tracking-tight">
              ID: {peerId.slice(0, 8)}...{peerId.slice(-4)}
            </p>
          </div>
        </div>
        <span
          className={`material-symbols-outlined text-primary ${!isPaused && "animate-pulse"}`}
        >
          {isPaused
            ? "pause_circle"
            : isUplink
              ? "lock"
              : "downloading"}
        </span>
      </div>

      {/* Main Progress Card */}
      <div className="bg-surface-inset/90 backdrop-blur-sm p-6 border border-subtle-bauhaus flex-1 flex flex-col gap-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#3a3827_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

        <div className="flex justify-between items-start z-10">
          <div>
            <h3 className="text-white font-black uppercase text-xl tracking-tighter">
              {isUplink ? "Uploading Payload" : "Receiving Payload"}
            </h3>
            <p className="text-muted text-xs font-mono mt-1">{fileName}</p>
          </div>
          <div className="text-right">
            <span className="text-primary font-mono text-2xl font-bold block">
              {percentage.toFixed(0)}%
            </span>
            <span className="text-white/30 text-xs uppercase tracking-wider">
              {isUplink ? "Completion" : "Integrity"}
            </span>
          </div>
        </div>

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
            className={`h-12 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] border ${isPaused
                ? "bg-primary text-black border-primary hover:bg-white"
                : "bg-transparent text-white border-white/20 hover:border-white hover:bg-white/5"
              }`}
          >
            <span className="material-symbols-outlined !text-[18px]">
              {isPaused ? "play_arrow" : "pause"}
            </span>
            {isPaused
              ? isUplink
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
            <span className="material-symbols-outlined !text-[18px]">
              block
            </span>
            Abort
          </button>
        </div>
      </div>
    </div>
  );
}
