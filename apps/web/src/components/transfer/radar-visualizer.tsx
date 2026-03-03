"use client";

interface RadarVisualizerProps {
  status: string;
}

export default function RadarVisualizer({ status }: RadarVisualizerProps) {
  return (
    <section className="lg:col-span-7 relative flex flex-col overflow-hidden border border-subtle-bauhaus bg-surface-deep">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundSize: "40px 40px",
          backgroundImage:
            "linear-gradient(to right, #3a3827 1px, transparent 1px), linear-gradient(to bottom, #3a3827 1px, transparent 1px)",
          maskImage:
            "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      ></div>

      {/* Radar Container */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[400px] p-8">
        {/* Radar Rings */}
        <div className="absolute flex items-center justify-center">
          {/* Outer Ring */}
          <div className="size-[300px] sm:size-[400px] border border-white/5 rounded-full flex items-center justify-center">
            {/* Mid Ring */}
            <div className="size-[200px] sm:size-[260px] border border-white/10 rounded-full flex items-center justify-center">
              {/* Inner Ring */}
              <div className="size-[100px] sm:size-[140px] border border-white/20 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <div className="size-3 bg-primary rounded-full shadow-[0_0_15px_#ffe500] animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-8 left-0 right-0 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-subtle-bauhaus">
            <span className="block size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <span className="text-xs font-mono text-muted uppercase">
              Radar Active
            </span>
          </div>
        </div>

        {/* Status Text */}
        <p className="mt-48 text-muted font-mono text-sm tracking-widest uppercase z-10">
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
