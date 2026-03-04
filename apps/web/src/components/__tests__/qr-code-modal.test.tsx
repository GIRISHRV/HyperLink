import React from "react";
import { render, screen, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import QRCodeModal from "@/components/qr-code-modal";

// Mock qrcode.react — we just need the SVG stub to render
vi.mock("qrcode.react", () => ({
    QRCodeSVG: ({ value }: { value: string }) => (
        <svg data-testid="qrcode-svg" aria-label={`QR code for ${value}`} />
    ),
}));

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
    useModalAccessibility: () => ({
        modalRef: { current: null },
        handleKeyDown: vi.fn(),
    }),
}));

describe("QRCodeModal", () => {
    const onClose = vi.fn();
    const peerId = "peer-abc-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when isOpen is false", () => {
        const { container } = render(
            <QRCodeModal isOpen={false} peerId={peerId} onClose={onClose} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders dialog with aria-label 'Scan Peer ID' when open", async () => {
        await act(async () => {
            render(<QRCodeModal isOpen={true} peerId={peerId} onClose={onClose} />);
        });
        expect(screen.getByRole("dialog", { name: /scan peer id/i })).toBeTruthy();
    });

    it("renders a QR code SVG element", async () => {
        await act(async () => {
            render(<QRCodeModal isOpen={true} peerId={peerId} onClose={onClose} />);
        });
        expect(screen.getByTestId("qrcode-svg")).toBeTruthy();
    });

    it("displays the peerId text for manual entry", async () => {
        await act(async () => {
            render(<QRCodeModal isOpen={true} peerId={peerId} onClose={onClose} />);
        });
        expect(screen.getByText(peerId)).toBeTruthy();
    });

    it("shows 'Manual Entry' label", async () => {
        await act(async () => {
            render(<QRCodeModal isOpen={true} peerId={peerId} onClose={onClose} />);
        });
        expect(screen.getByText(/manual entry/i)).toBeTruthy();
    });

    it("shows 'Scan Peer ID' heading", async () => {
        await act(async () => {
            render(<QRCodeModal isOpen={true} peerId={peerId} onClose={onClose} />);
        });
        // Heading reads "Scan <span>Peer ID</span>" — query the span directly
        expect(screen.getByText("Peer ID")).toBeTruthy();
    });

    it("calls onClose when Close button is clicked", async () => {
        await act(async () => {
            render(<QRCodeModal isOpen={true} peerId={peerId} onClose={onClose} />);
        });
        // The bottom "Close" button
        const closeButtons = screen.getAllByRole("button", { name: /close/i });
        // Click the last one (the full-width close button at the bottom)
        closeButtons[closeButtons.length - 1].click();
        expect(onClose).toHaveBeenCalled();
    });
});
