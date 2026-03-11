"use client";

import { useRouter } from "next/navigation";
import { isSecureContext } from "@/lib/utils/notification";
import type { PeerManager } from "@/lib/webrtc/peer-manager";
import type { RefObject } from "react";
import { parseError, getErrorInfo } from "@/lib/utils/error-messages";
import ErrorDisplay from "@/components/ui/error-display";

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
  const errorCode = parseError(error);
  const errorInfo = getErrorInfo(errorCode);

  return (
    <div className="text-center py-12 max-w-2xl mx-auto">
      <div className="mb-6">
        <ErrorDisplay error={errorInfo} />
      </div>

      <div className="mb-8 p-4 bg-white/5 border border-white/10 text-left font-mono text-xs space-y-2">
        <p className="text-primary font-bold uppercase mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">analytics</span>
          Diagnostic Report
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 opacity-70">
          <p>SECURE_CONTEXT:</p>
          <p className={isSecureContext() ? "text-green-400" : "text-bauhaus-red"}>
            {String(isSecureContext()).toUpperCase()}
          </p>
          <p>NETWORK_STATUS:</p>
          <p className="text-white">
            {typeof navigator !== "undefined" && navigator.onLine ? "ONLINE" : "OFFLINE"}
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
          <p>ERROR_CODE:</p>
          <p className="text-bauhaus-red">{errorCode}</p>
        </div>
        <p className="mt-4 text-xs text-white/30 italic">
          {error || "No additional details available"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onRetry}
          className="px-8 py-4 bg-primary hover:bg-white text-black font-black uppercase tracking-widest transition-all active:scale-95"
        >
          {errorInfo.action || "Try Again"}
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
