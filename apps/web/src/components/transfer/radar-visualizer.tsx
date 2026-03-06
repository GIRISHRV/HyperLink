"use client";

interface RadarVisualizerProps {
  status: string;
  isPeerReady?: boolean;
  className?: string;
}

export default function RadarVisualizer({ status, isPeerReady, className = "" }: RadarVisualizerProps) {
  // Determine ring animation and styling based on status
  let outerRing = "border-white/5";
  let midRing = "border-white/10";
  let innerRing = "border-white/20 bg-white/5 shadow-[0_0_30px_rgba(255,255,255,0.05)]";
  let dotColor = "bg-bauhaus-blue shadow-[0_0_15px_rgba(30,64,175,0.8)]";
  let dotAnimation = "animate-pulse";

  if (status === "offering") {
    outerRing = "border-bauhaus-blue/20 animate-[ping_3s_linear_infinite]";
    midRing = "border-bauhaus-blue/30 scale-110";
    innerRing = "border-bauhaus-blue/50 bg-bauhaus-blue/10 shadow-[0_0_30px_rgba(30,64,175,0.2)] animate-pulse";
    dotColor = "bg-bauhaus-blue shadow-[0_0_15px_rgba(30,64,175,0.8)]";
  } else if (status === "transferring") {
    outerRing = "border-primary/20 animate-[ping_2s_linear_infinite]";
    midRing = "border-primary/30 scale-125";
    innerRing = "border-primary/50 bg-primary/10 shadow-[0_0_30px_rgba(255,229,0,0.2)] animate-pulse";
    dotColor = "bg-primary shadow-[0_0_15px_#ffe500]";
  } else if (status === "paused") {
    outerRing = "border-white/5";
    midRing = "border-white/10";
    innerRing = "border-white/20 bg-white/5 opacity-50";
    dotAnimation = "";
    dotColor = "bg-yellow-500 shadow-none";
  } else if (status === "complete") {
    outerRing = "border-green-500/20";
    midRing = "border-green-500/30 scale-110";
    innerRing = "border-green-500/50 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.2)]";
    dotAnimation = "";
    dotColor = "bg-green-500 shadow-[0_0_15px_#22c55e]";
  } else if (status === "cancelled") {
    outerRing = "border-red-500/10";
    midRing = "border-red-500/10";
    innerRing = "border-red-500/20 bg-red-500/5";
    dotAnimation = "";
    dotColor = "bg-red-500 shadow-[0_0_15px_#ef4444]";
  }

  // Determine Badge Text
  let badgeText = "Scanning...";
  let badgeDot = "bg-primary shadow-[0_0_8px_rgba(255,229,0,0.6)]";
  if (status === "idle" && isPeerReady) {
    badgeText = "System Ready";
    badgeDot = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
  } else if (status === "offering") {
    badgeText = "Signal Detected";
    badgeDot = "bg-bauhaus-blue shadow-[0_0_8px_rgba(30,64,175,0.6)]";
  } else if (status === "transferring") {
    badgeText = "Link Active";
    badgeDot = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
  } else if (status === "paused") {
    badgeText = "Link Paused";
    badgeDot = "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]";
  } else if (status === "complete") {
    badgeText = "Transfer Complete";
    badgeDot = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
  } else if (status === "cancelled") {
    badgeText = "Link Lost";
    badgeDot = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
  }

  return (
    <section data-testid="radar-visualizer" className={`relative flex flex-col overflow-hidden border border-subtle-bauhaus bg-surface-deep ${className}`}>
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none z-0"
        style={{
          backgroundSize: "40px 40px",
          backgroundImage:
            "linear-gradient(to right, #3a3827 1px, transparent 1px), linear-gradient(to bottom, #3a3827 1px, transparent 1px)",
          maskImage:
            "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      ></div>

      {/* Radar Container */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[400px] p-8 z-10">
        {/* Radar Rings */}
        <div className="absolute flex items-center justify-center">
          {/* Outer Ring */}
          <div className={`size-[300px] sm:size-[400px] border rounded-full flex items-center justify-center transition-all duration-700 ${outerRing}`}>
            {/* Mid Ring */}
            <div className={`size-[200px] sm:size-[260px] border rounded-full flex items-center justify-center transition-all duration-700 ${midRing}`}>
              {/* Inner Ring */}
              <div className={`size-[100px] sm:size-[140px] border rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-700 ${innerRing}`}>
                <div className={`size-3 rounded-full transition-all duration-500 ${dotColor} ${dotAnimation}`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-8 left-0 right-0 text-center z-20" data-testid="radar-status-badge">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-subtle-bauhaus backdrop-blur-md">
            <span className={`block size-2 rounded-full ${badgeDot} transition-colors duration-500`}></span>
            <span className="text-xs font-mono text-muted uppercase transition-colors duration-500">
              {badgeText}
            </span>
          </div>
        </div>

        {/* Status Text */}
        <p className="mt-48 text-muted font-mono text-sm tracking-widest uppercase z-10 transition-colors duration-500 bg-surface-deep/80 px-4 py-1 rounded-full backdrop-blur-sm">
          {status === "idle" && "Waiting for connection..."}
          {status === "offering" && "Incoming File Offer"}
          {status === "transferring" && "Receiving Data..."}
          {status === "paused" && "Transfer Paused"}
          {status === "complete" && "Transfer Complete!"}
          {status === "cancelled" && "Transfer Cancelled"}
        </p>
      </div>
    </section>
  );
}
