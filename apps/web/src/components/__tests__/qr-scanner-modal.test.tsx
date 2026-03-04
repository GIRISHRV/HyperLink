import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import QRScannerModal from "@/components/qr-scanner-modal";

// Mock Html5Qrcode to avoid real camera access
vi.mock("html5-qrcode", () => {
    return {
        Html5Qrcode: vi.fn().mockImplementation(() => ({
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue(undefined),
            clear: vi.fn(),
            getState: vi.fn().mockResolvedValue(1), // 1 = NOT_STARTED
        })),
    };
});

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
    useModalAccessibility: () => ({
        modalRef: { current: null },
        handleKeyDown: vi.fn(),
    }),
}));

describe("QRScannerModal", () => {
    const onScan = vi.fn();
    const onClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when isOpen is false", () => {
        const { container } = render(
            <QRScannerModal isOpen={false} onScan={onScan} onClose={onClose} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders dialog with aria-label 'Scan QR Code' when open", () => {
        render(<QRScannerModal isOpen={true} onScan={onScan} onClose={onClose} />);
        expect(screen.getByRole("dialog", { name: /scan qr code/i })).toBeTruthy();
    });

    it("shows 'Scan QR Code' heading", () => {
        render(<QRScannerModal isOpen={true} onScan={onScan} onClose={onClose} />);
        // Heading reads "Scan <span>QR Code</span>" — query the span directly
        expect(screen.getByText("QR Code")).toBeTruthy();
    });

    it("renders #qr-reader container for scanner", () => {
        render(<QRScannerModal isOpen={true} onScan={onScan} onClose={onClose} />);
        expect(document.getElementById("qr-reader")).toBeTruthy();
    });

    it("renders Cancel button", () => {
        render(<QRScannerModal isOpen={true} onScan={onScan} onClose={onClose} />);
        expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
    });

    it("renders close icon button", () => {
        render(<QRScannerModal isOpen={true} onScan={onScan} onClose={onClose} />);
        // The close icon spans as button
        const closeBtn = screen.getByText("close");
        expect(closeBtn).toBeTruthy();
    });
});
