"use client";

interface ConfirmCancelModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    transferType?: "sending" | "receiving";
}

export default function ConfirmCancelModal({
    isOpen,
    onConfirm,
    onCancel,
    transferType = "sending",
}: ConfirmCancelModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-bauhaus-red via-primary to-bauhaus-blue" />

                {/* Content */}
                <div className="p-6 flex flex-col items-center text-center gap-4">
                    {/* Warning icon */}
                    <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center border border-orange-500/30">
                        <span className="material-symbols-outlined text-3xl text-orange-400">
                            warning
                        </span>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">
                            Cancel Transfer?
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Are you sure you want to cancel this file transfer? The {transferType === "sending" ? "receiver" : "sender"} will be
                            notified and the transfer will be marked as{" "}
                            <span className="text-orange-400 font-semibold">cancelled</span>.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-black/30 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 h-11 bg-white/10 hover:bg-white/20 text-white rounded font-bold text-sm uppercase tracking-wider transition-colors"
                    >
                        Keep Transferring
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 h-11 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">cancel</span>
                        Cancel Transfer
                    </button>
                </div>
            </div>
        </div>
    );
}
