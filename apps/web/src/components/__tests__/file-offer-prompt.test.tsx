import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import FileOfferPrompt from "@/components/file-offer-prompt";

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
    useModalAccessibility: () => ({
        modalRef: { current: null },
        handleKeyDown: vi.fn(),
    }),
}));

vi.mock("@repo/utils", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@repo/utils")>();
    return { ...actual, formatFileSize: (n: number) => `${n} B` };
});

describe("FileOfferPrompt", () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();

    const defaultProps = {
        isOpen: true,
        filename: "photo.jpg",
        fileSize: 1024,
        fileType: "image/jpeg",
        onAccept,
        onReject,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when isOpen is false", () => {
        const { container } = render(
            <FileOfferPrompt {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders dialog when isOpen is true", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("shows 'Incoming File' heading", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        expect(screen.getByText("Incoming File")).toBeTruthy();
    });

    it("displays the filename", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        expect(screen.getByText("photo.jpg")).toBeTruthy();
    });

    it("displays the file type", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        expect(screen.getByText("image/jpeg")).toBeTruthy();
    });

    it("shows the file extension as uppercase badge", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        expect(screen.getByText("JPG")).toBeTruthy();
    });

    it("shows 'Unknown type' when fileType is empty", () => {
        render(<FileOfferPrompt {...defaultProps} fileType="" />);
        expect(screen.getByText("Unknown type")).toBeTruthy();
    });

    it("renders Accept button", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        expect(screen.getByRole("button", { name: /accept/i })).toBeTruthy();
    });

    it("renders Decline button", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        expect(screen.getByRole("button", { name: /decline/i })).toBeTruthy();
    });

    it("calls onAccept when Accept is clicked", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        fireEvent.click(screen.getByRole("button", { name: /accept/i }));
        expect(onAccept).toHaveBeenCalledTimes(1);
    });

    it("calls onReject when Decline is clicked", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        fireEvent.click(screen.getByRole("button", { name: /decline/i }));
        expect(onReject).toHaveBeenCalledTimes(1);
    });

    it("shows P2P notice about no server storage", () => {
        render(<FileOfferPrompt {...defaultProps} />);
        expect(screen.getByText(/peer-to-peer/i)).toBeTruthy();
    });
});
