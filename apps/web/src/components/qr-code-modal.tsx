"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeModalProps {
    isOpen: boolean;
    peerId: string;
    onClose: () => void;
}

export default function QRCodeModal({ isOpen, peerId, onClose }: QRCodeModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1a1a] border border-[#3a3827] max-w-md w-full p-8 relative"
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
                    <p className="text-[#bcb89a] text-sm font-mono">
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
                <div className="bg-[#11110f] border border-[#3a3827] p-4">
                    <p className="text-[#bcb89a] text-xs font-bold uppercase tracking-wider mb-2">
                        Manual Entry
                    </p>
                    <p className="text-white font-mono text-sm break-all">
                        {peerId}
                    </p>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full mt-6 h-12 bg-primary hover:bg-[#ffea2e] text-black font-bold uppercase tracking-wider transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
