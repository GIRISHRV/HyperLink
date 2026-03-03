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
    <div className="lg:col-span-1 flex flex-col gap-6">
      <h3 className="font-mono text-muted text-sm mb-2 uppercase tracking-widest">
        Transfer Control
      </h3>
      <div className="flex flex-col gap-3">
        <label htmlFor="peer-id-input" className="text-xs font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">hub</span>
          Destination Peer ID
        </label>
        <div className="flex gap-2">
          <input
            id="peer-id-input"
            data-testid="peer-id-input"
            className="flex-1 bg-transparent border-b-2 border-white/20 focus:border-primary px-0 py-3 text-lg font-mono text-white placeholder-white/20 outline-none transition-colors"
            placeholder="Enter hash..."
            type="text"
            autoFocus
            value={receiverPeerId}
            onChange={(e) => onPeerIdChange(e.target.value)}
          />
          <button
            onClick={onQRScan}
            className="h-12 px-4 bg-transparent border-2 border-primary hover:bg-primary/10 text-primary flex items-center justify-center gap-2 transition-colors self-end"
            title="Scan QR Code"
          >
            <span className="material-symbols-outlined">
              qr_code_scanner
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">
            enhanced_encryption
          </span>
          Security (Optional)
        </label>
        {password ? (
          <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 p-3 rounded-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500">
                lock
              </span>
              <span className="text-sm font-bold text-green-400 uppercase tracking-wider">
                Encrypted
              </span>
            </div>
            <button
              onClick={onRemovePassword}
              className="text-xs text-red-400 hover:text-red-300 uppercase font-bold tracking-wider"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={onSetPassword}
            className="w-full h-12 border border-dashed border-white/20 hover:border-primary/50 hover:bg-white/5 text-gray-400 hover:text-primary flex items-center justify-center gap-2 transition-all uppercase text-xs font-bold tracking-widest"
          >
            <span className="material-symbols-outlined text-sm">
              add_moderator
            </span>
            Set Encryption Password
          </button>
        )}
      </div>

      <button
        data-testid="initiate-transfer-button"
        onClick={onSend}
        disabled={!hasFile || !receiverPeerId || !isPeerReady}
        className="w-full bg-primary hover:bg-primary-600 text-black h-16 flex items-center justify-center gap-3 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="font-black text-lg tracking-wider">
          INITIATE TRANSFER
        </span>
        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-bold">
          arrow_forward
        </span>
      </button>
    </div>
  );
}
