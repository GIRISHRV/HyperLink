"use client";

import { useTransferStats } from "@/lib/hooks/use-transfer-stats";
import { formatFileSize } from "@repo/utils";

export function DataMovedCard({ userId }: { userId: string }) {
  const { totalBytes, totalTransfers, isLoading } = useTransferStats(userId);

  if (isLoading) {
    return (
      <div className="bg-surface border border-subtle p-6 rounded-none animate-pulse min-h-[120px]">
        <div className="h-4 w-24 bg-subtle mb-4 rounded"></div>
        <div className="h-8 w-32 bg-subtle rounded"></div>
      </div>
    );
  }

  // Calculate split for styling (e.g. "4.2" and "GB")
  const formatted = formatFileSize(totalBytes);
  const parts = formatted.split(" ");
  const number = parts[0];
  const unit = parts.length > 1 ? parts[1] : "";

  return (
    <div className="bg-surface border border-subtle p-6 rounded-none relative overflow-hidden group hover:border-primary/50 transition-colors duration-500">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,234,46,0.02)_50%,transparent_75%)] bg-[length:250%_250%] animate-[gradient_15s_ease_infinite]" />

      <div className="relative z-10 flex flex-col gap-1">
        <h3 className="text-muted text-xs font-mono uppercase tracking-widest mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">database</span>
          Total Data Moved
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl md:text-5xl font-black text-white tracking-tight">
            {number}
          </span>
          <span className="text-xl font-bold text-primary">{unit}</span>
        </div>
        <div className="mt-2 text-xs font-mono text-gray-500 flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">scuba_diving</span>
          Across {totalTransfers} successful transfers
        </div>
      </div>

      {/* Decorative Corner */}
      <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
        <span className="material-symbols-outlined text-4xl text-primary">analytics</span>
      </div>
    </div>
  );
}
