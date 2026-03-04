import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ConfirmLeaveModal from "@/components/confirm-leave-modal";

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
    useModalAccessibility: () => ({
        modalRef: { current: null },
        handleKeyDown: vi.fn(),
    }),
}));

describe("ConfirmLeaveModal", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when isOpen is false", () => {
        const { container } = render(
            <ConfirmLeaveModal isOpen={false} onConfirm={onConfirm} onCancel={onCancel} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders dialog when isOpen is true", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("shows 'Transfer In Progress' heading", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText("Transfer In Progress")).toBeTruthy();
    });

    it("shows description about cancellation on leave", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(/transfer will be/i)).toBeTruthy();
    });

    it("renders 'Stay' button", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole("button", { name: /stay/i })).toBeTruthy();
    });

    it("renders 'Leave' button", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole("button", { name: /leave/i })).toBeTruthy();
    });

    it("calls onCancel when 'Stay' is clicked", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: /stay/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm when 'Leave' is clicked", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: /leave/i }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when backdrop is clicked", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        const backdrop = document.querySelector(".absolute.inset-0.bg-black\\/70");
        expect(backdrop).not.toBeNull();
        fireEvent.click(backdrop!);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("shows warning icon", () => {
        render(<ConfirmLeaveModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText("warning")).toBeTruthy();
    });
});
