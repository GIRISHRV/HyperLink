"use client";

interface PeerIdCardProps {
  peerId: string;
  onCopy: () => void;
  onShowQR: () => void;
}

export default function PeerIdCard({
  peerId,
  onCopy,
  onShowQR,
}: PeerIdCardProps) {
  return (
    <div className="bg-surface-elevated border border-subtle-bauhaus p-1 shadow-2xl shadow-black/50">
      <div className="bg-surface-inset border border-subtle-bauhaus/50 p-6 flex flex-col gap-6 relative overflow-hidden group">
        {/* Decorative blur */}
        <div className="absolute -right-10 -top-10 size-32 bg-primary/5 rounded-full blur-2xl"></div>

        <div className="flex flex-col gap-2 z-10">
          <label className="text-muted text-xs font-bold uppercase tracking-[0.15em]">
            Your Peer ID
          </label>
          <div
            data-testid="my-peer-id"
            className="font-mono text-2xl md:text-3xl text-white font-bold tracking-tight break-all border-l-4 border-primary pl-4 py-2"
          >
            {peerId ? peerId : "Loading..."}
          </div>
        </div>

        <div className="h-px w-full bg-subtle-bauhaus"></div>

        <div className="flex gap-3 z-10">
          <button
            onClick={onCopy}
            className="flex-1 h-12 bg-primary hover:bg-primary-hover text-surface-inset text-base font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined">content_copy</span>
            Copy ID
          </button>
          <button
            onClick={onShowQR}
            disabled={!peerId}
            className="flex-1 h-12 bg-transparent border-2 border-primary hover:bg-primary/10 text-primary text-base font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">qr_code_2</span>
            Show QR
          </button>
        </div>
      </div>
    </div>
  );
}
