"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerModalProps {
    isOpen: boolean;
    onScan: (data: string) => void;
    onClose: () => void;
}

export default function QRScannerModal({ isOpen, onScan, onClose }: QRScannerModalProps) {
    const [error, setError] = useState<string>("");
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hasScannedRef = useRef(false);

    const cleanup = useCallback(async () => {
        if (scannerRef.current) {
            try {
                // Check if scanner is actually running before trying to stop
                const state = await scannerRef.current.getState();
                // State 2 = SCANNING, State 3 = PAUSED
                if (state === 2 || state === 3) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                // Silently handle cleanup errors (common in React strict mode)
                console.warn("QR Scanner cleanup warning:", err);
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    }, []);

    const startScanner = useCallback(async () => {
        try {
            setIsScanning(true);
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    if (!hasScannedRef.current) {
                        hasScannedRef.current = true;
                        onScan(decodedText);
                        cleanup();
                        onClose();
                    }
                },
                (_errorMessage) => {
                    // Ignore individual frame errors
                }
            );
        } catch (err: any) {
            console.error("QR Scanner error:", err);
            setError(err.message || "Failed to access camera. Please check permissions.");
            setIsScanning(false);
        }
    }, [onScan, onClose, cleanup]);

    useEffect(() => {
        if (!isOpen) {
            cleanup();
            return;
        }

        hasScannedRef.current = false;
        setError("");
        startScanner();

        return () => {
            cleanup();
        };
    }, [isOpen, startScanner, cleanup]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1a1a] border border-[#3a3827] max-w-md w-full p-8 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
                >
                    <span className="material-symbols-outlined text-2xl">close</span>
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
                        Scan <span className="text-primary">QR Code</span>
                    </h2>
                    <p className="text-[#bcb89a] text-sm font-mono">
                        Point your camera at the receiver&apos;s QR code
                    </p>
                </div>

                {/* Scanner Container */}
                <div className="relative">
                    <div
                        id="qr-reader"
                        className="w-full overflow-hidden rounded border-2 border-primary/50"
                    />

                    {/* Scanning Overlay */}
                    {isScanning && !error && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-primary animate-pulse" />
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/30 p-4">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Instructions */}
                {isScanning && !error && (
                    <div className="mt-4 bg-[#11110f] border border-[#3a3827] p-4">
                        <p className="text-[#bcb89a] text-xs font-mono text-center">
                            Position the QR code within the frame
                        </p>
                    </div>
                )}

                {/* Cancel Button */}
                <button
                    onClick={onClose}
                    className="w-full mt-6 h-12 bg-transparent border border-white/20 hover:border-white hover:bg-white/5 text-white font-bold uppercase tracking-wider transition-all"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
