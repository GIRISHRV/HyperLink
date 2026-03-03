"use client";

import { useRouter } from "next/navigation";
import { isSecureContext } from "@/lib/utils/notification";
import type { PeerManager } from "@/lib/webrtc/peer-manager";
import type { RefObject } from "react";

interface TransferFailedStateProps {
  error: string;
  peerManagerRef: RefObject<PeerManager | null>;
  onRetry: () => void;
}

export default function TransferFailedState({
  error,
  peerManagerRef,
  onRetry,
}: TransferFailedStateProps) {
  const router = useRouter();

  return (
    <div className="text-center py-12 max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto mb-4 bg-bauhaus-red flex items-center justify-center shadow-[0_0_20px_rgba(255,59,48,0.3)]">
        <span className="material-symbols-outlined text-3xl text-white">
          error
        </span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">
        Transfer Failed
      </h3>
      <p className="text-bauhaus-red mb-6 font-mono text-sm border border-bauhaus-red/20 bg-bauhaus-red/5 p-3 leading-relaxed">
        {error || "Unknown error occurred"}
      </p>

      <div className="mb-8 p-4 bg-white/5 border border-white/10 text-left font-mono text-xs space-y-2">
        <p className="text-primary font-bold uppercase mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">
            analytics
          </span>
          Diagnostic Report
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 opacity-70">
          <p>SECURE_CONTEXT:</p>
          <p
            className={
              isSecureContext() ? "text-green-400" : "text-bauhaus-red"
            }
          >
            {String(isSecureContext()).toUpperCase()}
          </p>
          <p>NETWORK_STATUS:</p>
          <p className="text-white">
            {typeof navigator !== "undefined" && navigator.onLine
              ? "ONLINE"
              : "OFFLINE"}
          </p>
          <p>SIGNALING_SERVER:</p>
          <p
            className={
              peerManagerRef.current?.getState() === "failed"
                ? "text-bauhaus-red"
                : "text-green-400"
            }
          >
            {peerManagerRef.current?.getState()?.toUpperCase() || "UNKNOWN"}
          </p>
        </div>
        <p className="mt-4 text-xs text-white/30 italic">
          Hint: If on mobile, ensure you are using HTTPS. &quot;Connection
          timeout&quot; often indicates NAT traversal issues.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onRetry}
          className="px-8 py-4 bg-primary hover:bg-white text-black font-black uppercase tracking-widest transition-all active:scale-95"
        >
          Try Again
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-8 py-4 border border-white/20 hover:border-white text-white font-bold uppercase tracking-widest transition-all"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}
