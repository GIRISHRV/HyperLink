"use client";

import { QRCodeSVG } from "qrcode.react";
import { useModalAccessibility } from "@/lib/hooks/use-modal-accessibility";

interface QRCodeModalProps {
    isOpen: boolean;
    peerId: string;
    onClose: () => void;
}

export default function QRCodeModal({ isOpen, peerId, onClose }: QRCodeModalProps) {
    const { modalRef, handleKeyDown } = useModalAccessibility(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div
            ref={modalRef}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="Scan Peer ID"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface border border-subtle-bauhaus max-w-md w-full p-8 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-2xl">close</span>
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
                        Scan <span className="text-primary">Peer ID</span>
                    </h2>
                    <p className="text-muted text-sm font-mono">
                        Use sender&apos;s camera to scan this code
                    </p>
                </div>

                {/* QR Code */}
                <div className="bg-white p-6 flex items-center justify-center mb-6">
                    <QRCodeSVG
                        value={peerId}
                        size={256}
                        level="H"
                        includeMargin={false}
                    />
                </div>

                {/* Peer ID Text */}
                <div className="bg-surface-inset border border-subtle-bauhaus p-4">
                    <p className="text-muted text-xs font-bold uppercase tracking-wider mb-2">
                        Manual Entry
                    </p>
                    <p className="text-white font-mono text-sm break-all">
                        {peerId}
                    </p>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full mt-6 h-12 bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
