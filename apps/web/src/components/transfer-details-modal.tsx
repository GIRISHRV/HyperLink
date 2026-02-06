"use client";

import type { Transfer } from "@repo/types";
import { formatFileSize } from "@repo/utils";
import { updateTransferStatus, deleteTransfer } from "@/lib/services/transfer-service";

interface TransferDetailsModalProps {
    transfer: Transfer;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export default function TransferDetailsModal({
    transfer,
    isOpen,
    onClose,
    onUpdate,
}: TransferDetailsModalProps) {
    if (!isOpen) return null;

    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
        pending: { color: "text-yellow-400", bg: "bg-yellow-900/30", label: "Pending" },
        connecting: { color: "text-blue-400", bg: "bg-blue-900/30", label: "Connecting" },
        transferring: { color: "text-blue-400", bg: "bg-blue-900/30", label: "Transferring" },
        complete: { color: "text-green-400", bg: "bg-green-900/30", label: "Complete" },
        failed: { color: "text-red-400", bg: "bg-red-900/30", label: "Failed" },
        cancelled: { color: "text-gray-400", bg: "bg-gray-900/30", label: "Cancelled" },
    };

    const status = statusConfig[transfer.status] || statusConfig.pending;
    const isActive = ["pending", "connecting", "transferring"].includes(transfer.status);

    async function handleCancel() {
        if (confirm("Are you sure you want to cancel this transfer?")) {
            await updateTransferStatus(transfer.id, "cancelled");
            onUpdate?.();
            onClose();
        }
    }

    async function handleDelete() {
        if (confirm("Are you sure you want to delete this transfer record?")) {
            await deleteTransfer(transfer.id);
            onUpdate?.();
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">Transfer Details</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* File Info */}
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-2xl">
                                description
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold truncate">{transfer.filename}</p>
                            <p className="text-gray-400 text-sm">{formatFileSize(transfer.file_size)}</p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">Status:</span>
                        <span className={`px-3 py-1 rounded-full ${status.bg} ${status.color} text-sm font-bold`}>
                            {status.label}
                        </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 mb-1">Created</p>
                            <p className="text-white">
                                {new Date(transfer.created_at).toLocaleString()}
                            </p>
                        </div>
                        {transfer.completed_at && (
                            <div>
                                <p className="text-gray-500 mb-1">Completed</p>
                                <p className="text-white">
                                    {new Date(transfer.completed_at).toLocaleString()}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-gray-500 mb-1">Transfer ID</p>
                            <p className="text-white font-mono text-xs truncate">{transfer.id}</p>
                        </div>
                    </div>

                    {/* File Availability Notice */}
                    {transfer.status === "complete" && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <span className="material-symbols-outlined text-gray-400">info</span>
                            <p className="text-gray-400 text-sm">
                                File no longer available. P2P transfers are not stored on servers.
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-black/30 flex gap-3 justify-end">
                    {isActive && (
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">cancel</span>
                            Cancel Transfer
                        </button>
                    )}
                    {!isActive && (
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                            Delete Record
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-bold text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
