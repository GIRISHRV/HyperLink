"use client";

import { isSecureContext } from "@/lib/utils/notification";
import type { PeerManager } from "@/lib/webrtc/peer-manager";
import type { RefObject } from "react";

interface DiagnosticPanelProps {
  peerManagerRef: RefObject<PeerManager | null>;
  onClear: () => void;
  error: string;
}

export default function DiagnosticPanel({
  peerManagerRef,
  onClear,
  error,
}: DiagnosticPanelProps) {
  return (
    <div className="bg-bauhaus-red/10 border border-bauhaus-red/30 p-4 space-y-4">
      <p className="text-bauhaus-red text-sm font-mono border-b border-bauhaus-red/20 pb-2">
        {error}
      </p>

      {/* Hide diagnostic details for simple incorrect password errors */}
      {error !== "Incorrect password. The transfer was cancelled." && (
        <div className="text-left font-mono text-[9px] text-[#bcb89a] space-y-1 bg-black/40 p-3">
          <p className="text-primary font-bold uppercase mb-2">
            Diagnostic Data
          </p>
          <div className="grid grid-cols-2 gap-x-2">
            <p>SECURE_CONTEXT:</p>
            <p
              className={
                isSecureContext() ? "text-green-400" : "text-bauhaus-red"
              }
            >
              {String(isSecureContext()).toUpperCase()}
            </p>
            <p>NETWORK:</p>
            <p className="text-white">
              {navigator.onLine ? "ONLINE" : "OFFLINE"}
            </p>
            <p>PEER_STATUS:</p>
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
          <p className="mt-3 text-[8px] text-white/30 italic">
            Tip: Safari/iOS prevents WebRTC on HTTP. Ensure both sides are
            using HTTPS.
          </p>
        </div>
      )}

      <button
        onClick={onClear}
        className="w-full py-2 bg-bauhaus-red/20 hover:bg-bauhaus-red/40 text-bauhaus-red text-[10px] font-bold uppercase tracking-widest transition-colors"
      >
        Clear Error
      </button>
    </div>
  );
}
