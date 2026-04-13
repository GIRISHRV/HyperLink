"use client";

import { useState } from "react";

interface PeerIdCardProps {
  peerId: string;
  onCopy: () => void;
  onShowQR: () => void;
}

export default function PeerIdCard({ peerId, onCopy, onShowQR }: PeerIdCardProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const copyTransferLink = async () => {
    if (!peerId) return;

    const url = `${window.location.origin}/send?peerId=${peerId}`;

    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-black/20 p-5">
      <div className="flex flex-col gap-5 relative overflow-hidden">
        <div className="flex flex-col gap-2 z-10">
          <label className="text-muted text-xs font-bold uppercase tracking-[0.15em]">
            Your Peer ID
          </label>
          <div
            data-testid="my-peer-id"
            className="rounded-lg border border-primary/40 bg-black/30 px-4 py-3 font-mono text-xl md:text-2xl text-white font-bold tracking-tight break-all"
          >
            {peerId ? (
              peerId
            ) : (
              <div className="flex items-center gap-2">
                <span className="animate-pulse">Loading...</span>
                <span className="inline-flex gap-1">
                  <span className="size-1.5 bg-primary rounded-full animate-[bounce_1s_ease-in-out_0s_infinite]"></span>
                  <span className="size-1.5 bg-primary rounded-full animate-[bounce_1s_ease-in-out_0.2s_infinite]"></span>
                  <span className="size-1.5 bg-primary rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]"></span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="h-px w-full bg-primary/20"></div>

        <div className="flex flex-col gap-3 z-10">
          <div className="flex gap-3">
            <button
              data-testid="peer-id-copy-button"
              onClick={onCopy}
              className="flex-1 h-11 rounded-lg bg-primary hover:bg-primary-hover text-black text-sm font-bold tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined">content_copy</span>
              Copy ID
            </button>
            <button
              data-testid="peer-id-show-qr-button"
              onClick={onShowQR}
              disabled={!peerId}
              className="flex-1 h-11 rounded-lg border border-primary/70 hover:bg-primary/10 text-primary text-sm font-bold tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">qr_code_2</span>
              Show QR
            </button>
          </div>

          <button
            data-testid="peer-transfer-link-button"
            onClick={copyTransferLink}
            disabled={!peerId}
            className="w-full h-10 rounded-lg bg-black/30 border border-primary/30 hover:border-primary/60 hover:bg-black/40 text-gray-300 hover:text-primary text-xs font-bold tracking-[0.12em] uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">{linkCopied ? "check" : "link"}</span>
            {linkCopied ? "Link Copied!" : "Copy Transfer Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
