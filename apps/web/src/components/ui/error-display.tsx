"use client";

import type { ErrorInfo } from "@/lib/utils/error-messages";

interface ErrorDisplayProps {
  error: ErrorInfo;
  onAction?: () => void;
  onDismiss?: () => void;
}

export default function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const severityColors = {
    error: {
      bg: "bg-bauhaus-red/10",
      border: "border-bauhaus-red",
      text: "text-bauhaus-red",
      icon: "error",
    },
    warning: {
      bg: "bg-bauhaus-yellow/10",
      border: "border-bauhaus-yellow",
      text: "text-bauhaus-yellow",
      icon: "warning",
    },
    info: {
      bg: "bg-bauhaus-blue/10",
      border: "border-bauhaus-blue",
      text: "text-bauhaus-blue",
      icon: "info",
    },
  };

  const colors = severityColors[error.severity];

  return (
    <div
      className={`${colors.bg} border-l-4 ${colors.border} p-6 relative shadow-[0_0_30px_-10px_rgba(255,59,48,0.2)]`}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      )}

      <div className="flex gap-4">
        <div
          className={`${colors.bg} p-3 border ${colors.border}/20 flex items-center justify-center shrink-0 w-16 h-16`}
        >
          <span className={`material-symbols-outlined ${colors.text} text-3xl`}>{colors.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-black text-lg uppercase tracking-tight mb-2">
            {error.title}
          </h3>

          <p className="text-gray-300 font-bold text-sm mb-3">{error.message}</p>

          <p className="text-xs text-white/50 font-mono">{error.suggestion}</p>
        </div>
      </div>
    </div>
  );
}
