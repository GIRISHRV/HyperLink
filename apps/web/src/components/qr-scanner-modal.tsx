"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useModalAccessibility } from "@/lib/hooks/use-modal-accessibility";
import { logger } from "@repo/utils";

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
  const { modalRef, handleKeyDown } = useModalAccessibility(isOpen, onClose);

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
        logger.warn({ err }, "QR Scanner cleanup warning:");
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
    } catch (err: unknown) {
      logger.error({ err }, "QR Scanner error:");
      const message =
        err instanceof Error ? err.message : "Failed to access camera. Please check permissions.";
      setError(message);
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
      ref={modalRef}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR Code"
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-subtle-bauhaus max-w-md w-full p-8 relative"
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
          <p className="text-muted text-sm font-mono">
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
          <div className="mt-4 bg-surface-inset border border-subtle-bauhaus p-4">
            <p className="text-muted text-xs font-mono text-center">
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
