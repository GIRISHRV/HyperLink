"use client";

import { useState, useEffect } from "react";
import type { Transfer } from "@repo/types";
import { formatFileSize } from "@repo/utils";
import { updateTransferStatus, deleteTransfer } from "@/lib/services/transfer-service";
import { getFile } from "@/lib/storage/idb-manager";
import Image from "next/image";

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
    const [fileBlob, setFileBlob] = useState<Blob | null>(null);
    const [isCheckingFile, setIsCheckingFile] = useState(true);

    useEffect(() => {
        if (isOpen && transfer.status === "complete") {
            setIsCheckingFile(true);
            getFile(transfer.id)
                .then(blob => {
                    setFileBlob(blob || null);
                })
                .catch(err => {
                    console.error("Failed to check file availability:", err);
                    setFileBlob(null);
                })
                .finally(() => setIsCheckingFile(false));
        } else {
            setFileBlob(null);
            setIsCheckingFile(false);
        }
    }, [isOpen, transfer]);

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

    // Determine preview type
    const ext = transfer.filename.split('.').pop()?.toLowerCase();
    const isImage = fileBlob && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
    const isVideo = fileBlob && ['mp4', 'webm', 'ogg', 'mov'].includes(ext || '');

    function getPreviewUrl() {
        if (!fileBlob) return '';
        return URL.createObjectURL(fileBlob);
    }

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

    function handleDownload() {
        if (!fileBlob) return;
        const url = URL.createObjectURL(fileBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = transfer.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                    <h3 className="text-lg font-bold text-white">Transfer Details</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 space-y-6 overflow-y-auto">
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

                    {/* PREVIEW SECTION (Merged) */}
                    {fileBlob && (
                        <div className="bg-black/40 rounded-lg border border-white/10 overflow-hidden">
                            {isImage ? (
                                <div className="relative w-full h-48 sm:h-64">
                                    <Image
                                        src={getPreviewUrl()}
                                        alt={transfer.filename}
                                        fill
                                        className="object-contain"
                                        unoptimized // For blob URLs
                                    />
                                </div>
                            ) : isVideo ? (
                                <video
                                    src={getPreviewUrl()}
                                    controls
                                    className="w-full max-h-64 bg-black"
                                />
                            ) : (
                                <div className="p-8 flex flex-col items-center justify-center text-gray-500 gap-2">
                                    <span className="material-symbols-outlined text-4xl">insert_drive_file</span>
                                    <span className="text-xs uppercase tracking-widest">No Preview Available</span>
                                </div>
                            )}
                            <div className="p-3 bg-white/5 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={handleDownload}
                                    className="text-xs font-bold uppercase tracking-wider text-primary hover:text-white flex items-center gap-1 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">download</span>
                                    Download File
                                </button>
                            </div>
                        </div>
                    )}

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

                    {/* File Availability Notice (Conditional) */}
                    {transfer.status === "complete" && !fileBlob && !isCheckingFile && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <span className="material-symbols-outlined text-gray-400">info</span>
                            <p className="text-gray-400 text-sm">
                                File details might have been erased. P2P transfers are ephemeral.
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-black/30 flex gap-3 justify-end shrink-0">
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
