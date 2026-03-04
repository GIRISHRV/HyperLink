import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ConfirmCancelModal from "@/components/confirm-cancel-modal";

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
    useModalAccessibility: () => ({
        modalRef: { current: null },
        handleKeyDown: vi.fn(),
    }),
}));

describe("ConfirmCancelModal", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when isOpen is false", () => {
        const { container } = render(
            <ConfirmCancelModal isOpen={false} onConfirm={onConfirm} onCancel={onCancel} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders dialog with role=dialog when open", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("shows 'Cancel Transfer?' heading", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText("Cancel Transfer?")).toBeTruthy();
    });

    it("shows correct description for 'sending' (default transferType)", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(/receiver/)).toBeTruthy();
    });

    it("shows correct description for 'receiving' transferType", () => {
        render(
            <ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} transferType="receiving" />
        );
        expect(screen.getByText(/sender/)).toBeTruthy();
    });

    it("renders 'Keep Transferring' button", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole("button", { name: /keep transferring/i })).toBeTruthy();
    });

    it("renders 'Cancel Transfer' confirm button", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole("button", { name: /cancel transfer/i })).toBeTruthy();
    });

    it("calls onCancel when 'Keep Transferring' is clicked", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: /keep transferring/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm when 'Cancel Transfer' is clicked", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: /cancel transfer/i }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when backdrop is clicked", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        // Backdrop is the absolute inset-0 div preceding the modal content
        const backdrop = document.querySelector(".absolute.inset-0.bg-black\\/70");
        expect(backdrop).not.toBeNull();
        fireEvent.click(backdrop!);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("shows warning icon", () => {
        render(<ConfirmCancelModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText("warning")).toBeTruthy();
    });
});
