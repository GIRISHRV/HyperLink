import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Transfer } from "@repo/types";
import TransferDetailsModal from "@/components/transfer-details-modal";

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
    useModalAccessibility: () => ({
        modalRef: { current: null },
        handleKeyDown: vi.fn(),
    }),
}));

vi.mock("next/image", () => ({
    default: ({ src, alt }: { src: string; alt: string }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
    ),
}));

vi.mock("@/lib/services/transfer-service", () => ({
    updateTransferStatus: vi.fn().mockResolvedValue(undefined),
    deleteTransfer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/storage/idb-manager", () => ({
    getFile: vi.fn().mockResolvedValue(null),
}));

globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
globalThis.URL.revokeObjectURL = vi.fn();

const mockTransfer: Transfer = {
    id: "transfer-001",
    filename: "document.pdf",
    file_size: 1024 * 1024,
    sender_id: "user-sender",
    receiver_id: "user-receiver",
    status: "complete",
    created_at: new Date("2024-01-15T10:00:00Z").toISOString(),
    completed_at: new Date("2024-01-15T10:05:00Z").toISOString(),
};

const pendingTransfer: Transfer = {
    ...mockTransfer,
    id: "transfer-002",
    status: "pending",
    completed_at: null,
};

describe("TransferDetailsModal", () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when isOpen is false", () => {
        const { container } = render(
            <TransferDetailsModal transfer={mockTransfer} isOpen={false} onClose={onClose} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders dialog with 'Transfer Details' label when open", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        expect(screen.getByRole("dialog", { name: /transfer details/i })).toBeTruthy();
    });

    it("shows the filename", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        expect(screen.getByText("document.pdf")).toBeTruthy();
    });

    it("shows the transfer ID", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        expect(screen.getByText("transfer-001")).toBeTruthy();
    });

    it("shows 'Complete' status badge for complete transfer", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        expect(screen.getByText("Complete")).toBeTruthy();
    });

    it("shows 'Pending' status badge for pending transfer", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={pendingTransfer} isOpen={true} onClose={onClose} />);
        });
        expect(screen.getByText("Pending")).toBeTruthy();
    });

    it("shows 'Cancel Transfer' button for active (pending) transfers", async () => {
        await act(async () => {
            render(
                <TransferDetailsModal transfer={pendingTransfer} isOpen={true} onClose={onClose} onUpdate={onUpdate} />
            );
        });
        expect(screen.getByRole("button", { name: /cancel transfer/i })).toBeTruthy();
    });

    it("shows 'Delete Record' button for inactive (complete) transfers", async () => {
        await act(async () => {
            render(
                <TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} onUpdate={onUpdate} />
            );
        });
        expect(screen.getByRole("button", { name: /delete record/i })).toBeTruthy();
    });

    it("renders Close button(s)", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        // Two close buttons: header × icon + footer 'Close' text button
        expect(screen.getAllByRole("button", { name: /close/i }).length).toBeGreaterThan(0);
    });

    it("calls onClose when footer Close button is clicked", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        // Pick the last 'close' button — that's the footer text button
        const closeBtns = screen.getAllByRole("button", { name: /close/i });
        fireEvent.click(closeBtns[closeBtns.length - 1]);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("shows created_at date", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        // Date is rendered via toLocaleString — just check 'Created' label exists
        expect(screen.getByText("Created")).toBeTruthy();
    });

    it("shows completed_at date when present", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        expect(screen.getByText("Completed")).toBeTruthy();
    });

    it("shows ephemeral file notice for complete transfer without file blob", async () => {
        await act(async () => {
            render(<TransferDetailsModal transfer={mockTransfer} isOpen={true} onClose={onClose} />);
        });
        // getFile mock returns null so the notice "File details might have been erased..." should appear
        await act(async () => {}); // settle async state
        expect(screen.getByText(/ephemeral/i)).toBeTruthy();
    });
});
