import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import PasswordModal from "@/components/password-modal";

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
    useModalAccessibility: () => ({
        modalRef: { current: null },
        handleKeyDown: vi.fn(),
    }),
}));

describe("PasswordModal", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when isOpen is false", () => {
        const { container } = render(
            <PasswordModal isOpen={false} onSubmit={onSubmit} onCancel={onCancel} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders dialog when isOpen is true", () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("shows default title 'Password Required'", () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        expect(screen.getByText("Password Required")).toBeTruthy();
    });

    it("shows custom title when provided", () => {
        render(
            <PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} title="Custom Title" />
        );
        expect(screen.getByText("Custom Title")).toBeTruthy();
    });

    it("shows default description", () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        expect(screen.getByText(/This file is encrypted/)).toBeTruthy();
    });

    it("shows custom description when provided", () => {
        render(
            <PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} description="My desc" />
        );
        expect(screen.getByText("My desc")).toBeTruthy();
    });

    it("shows 'Enter Password' label when isCreation is false (default)", () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        expect(screen.getByText("Enter Password")).toBeTruthy();
    });

    it("shows 'Set Password' label when isCreation is true", () => {
        render(
            <PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} isCreation={true} />
        );
        expect(screen.getAllByText("Set Password").length).toBeGreaterThan(0);
    });

    it("shows 'Decrypt' submit button when isCreation is false", () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        expect(screen.getByRole("button", { name: /decrypt/i })).toBeTruthy();
    });

    it("shows 'Set Password' submit button when isCreation is true", () => {
        render(
            <PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} isCreation={true} />
        );
        expect(screen.getAllByRole("button", { name: /set password/i }).length).toBeGreaterThan(0);
    });

    it("calls onCancel when Cancel button is clicked", () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("shows error when submitting empty password", async () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: /decrypt/i }));
        await waitFor(() => {
            expect(screen.getByText("Password cannot be empty")).toBeTruthy();
        });
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("calls onSubmit with the typed password", async () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        const input = screen.getByLabelText(/enter password/i);
        await userEvent.type(input, "secret123");
        fireEvent.click(screen.getByRole("button", { name: /decrypt/i }));
        expect(onSubmit).toHaveBeenCalledWith("secret123");
    });

    it("clears input after successful submit", async () => {
        render(<PasswordModal isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />);
        const input = screen.getByLabelText(/enter password/i) as HTMLInputElement;
        await userEvent.type(input, "secret");
        fireEvent.click(screen.getByRole("button", { name: /decrypt/i }));
        expect(input.value).toBe("");
    });
});
