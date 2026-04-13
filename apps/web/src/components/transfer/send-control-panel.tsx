"use client";

interface SendControlPanelProps {
  receiverPeerId: string;
  onPeerIdChange: (id: string) => void;
  onQRScan: () => void;
  password: string;
  onSetPassword: () => void;
  onRemovePassword: () => void;
  onSend: () => void;
  isPeerReady: boolean;
  hasFile: boolean;
}

export default function SendControlPanel({
  receiverPeerId,
  onPeerIdChange,
  onQRScan,
  password,
  onSetPassword,
  onRemovePassword,
  onSend,
  isPeerReady,
  hasFile,
}: SendControlPanelProps) {
  return (
    <div
      data-testid="send-control-panel"
      className="lg:col-span-1 flex flex-col justify-between gap-5 rounded-xl border border-white/10 bg-black/20 p-5 h-full min-h-[220px]"
    >
      <h3 className="font-mono text-muted text-[11px] uppercase tracking-[0.2em]">
        Transfer Setup
      </h3>
      <div className="flex flex-col gap-2.5">
        <label
          htmlFor="peer-id-input"
          className="text-xs font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">hub</span>
          Receiver Code
        </label>
        <div className="flex gap-2">
          <input
            id="peer-id-input"
            data-testid="peer-id-input"
            className="flex-1 h-12 rounded-lg border border-white/15 bg-black/30 px-3 text-base font-mono text-white placeholder:text-white/30 outline-none transition-colors focus:border-primary"
            placeholder="Enter receiver code"
            type="text"
            autoFocus
            value={receiverPeerId}
            onChange={(e) => onPeerIdChange(e.target.value)}
          />
          <button
            data-testid="scan-qr-button"
            onClick={onQRScan}
            className="h-12 w-12 rounded-lg border border-primary/70 bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors shrink-0"
            title="Scan QR Code"
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">enhanced_encryption</span>
          Extra Encryption (Optional)
        </label>
        {password ? (
          <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500">lock</span>
              <span
                data-testid="encryption-status-badge"
                className="text-xs font-bold text-green-300 uppercase tracking-[0.12em]"
              >
                Encrypted
              </span>
            </div>
            <button
              data-testid="remove-encryption-password-button"
              onClick={onRemovePassword}
              className="rounded-md px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10 hover:text-red-200 uppercase font-bold tracking-[0.12em] transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            data-testid="set-encryption-password-button"
            onClick={onSetPassword}
            className="w-full h-12 rounded-lg border border-dashed border-white/20 hover:border-primary/60 hover:bg-primary/5 text-gray-300 hover:text-primary flex items-center justify-center gap-2 transition-all uppercase text-xs font-bold tracking-widest"
          >
            <span className="material-symbols-outlined text-sm">add_moderator</span>
            Set Encryption Password
          </button>
        )}
      </div>

      <button
        data-testid="initiate-transfer-button"
        onClick={onSend}
        disabled={!hasFile || !receiverPeerId || !isPeerReady}
        className="w-full h-14 rounded-lg bg-primary hover:bg-primary-600 text-black flex items-center justify-center gap-3 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="font-black text-base tracking-[0.12em] uppercase">Send File</span>
        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-bold">
          arrow_forward
        </span>
      </button>
    </div>
  );
}
