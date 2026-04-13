"use client";

interface TransferVisualizerProps {
  isPaused: boolean;
  /** "uplink" for send, "downlink" for receive */
  direction: "uplink" | "downlink";
}

export default function TransferVisualizer({ isPaused, direction }: TransferVisualizerProps) {
  const isUplink = direction === "uplink";

  return (
    <div className="lg:col-span-7 relative min-h-[400px] border border-subtle-bauhaus bg-surface-deep overflow-hidden flex items-center justify-center">
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Central Element */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="absolute w-[300px] h-[300px] border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
        <div className="absolute w-[200px] h-[200px] border border-dashed border-primary/40 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
        <div className="absolute w-[100px] h-[100px] bg-primary/10 rounded-full blur-xl animate-pulse" />

        {/* Core */}
        <div className="w-16 h-16 bg-surface border border-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,234,46,0.5)] z-20">
          <span
            className={`material-symbols-outlined text-primary text-3xl ${!isPaused && (isUplink ? "animate-ping" : "animate-pulse")}`}
          >
            {isUplink ? "upload" : "download"}
          </span>
        </div>

        {/* Particles */}
        {!isPaused && (
          <>
            <div
              className={`absolute w-2 h-2 bg-primary rounded-full ${isUplink ? "animate-[ping_2s_linear_infinite]" : "animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_reverse]"}`}
              style={{ top: "-100px" }}
            />
            <div
              className={`absolute w-2 h-2 bg-primary rounded-full ${isUplink ? "animate-[ping_2.5s_linear_infinite]" : "animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_reverse]"}`}
              style={{ bottom: "-80px", right: "-40px" }}
            />
            <div
              className={`absolute w-2 h-2 bg-primary rounded-full ${isUplink ? "animate-[ping_1.8s_linear_infinite]" : "animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite_reverse]"}`}
              style={{ bottom: "-20px", left: "-90px" }}
            />
          </>
        )}

        {isUplink && (
          <div className="absolute inset-0 w-full h-[2px] bg-primary/50 top-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite] shadow-[0_0_10px_rgba(255,234,46,0.8)]" />
        )}
      </div>

      {/* Status Overlays */}
      <div className="absolute top-6 left-6 flex flex-col gap-1">
        <span className="text-xs font-bold text-primary uppercase tracking-widest border border-primary px-2 py-1 bg-primary/10">
          {isUplink ? "Sending" : "Receiving"}
        </span>
        <span className="text-xs font-mono text-white/50">End-to-end encrypted</span>
      </div>

      <div className="absolute bottom-6 right-6 text-right">
        <p className="text-muted font-mono text-xs uppercase tracking-widest">
          {isPaused ? "Transfer paused" : isUplink ? "Sending data" : "Receiving data"}
        </p>
        <div className="flex justify-end gap-1 mt-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 ${!isPaused ? "bg-primary animate-pulse" : "bg-white/10"}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
