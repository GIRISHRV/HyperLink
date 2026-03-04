import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TransferCompleteState from "@/components/transfer/transfer-complete-state";

describe("TransferCompleteState", () => {
    const onReset = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        const { container } = render(<TransferCompleteState fileName="file.txt" onReset={onReset} />);
        expect(container.firstChild).not.toBeNull();
    });

    it("shows 'Transfer Complete!' heading", () => {
        render(<TransferCompleteState fileName="file.txt" onReset={onReset} />);
        expect(screen.getByText(/transfer complete/i)).toBeTruthy();
    });

    it("shows the filename in the success message", () => {
        render(<TransferCompleteState fileName="photo.jpg" onReset={onReset} />);
        expect(screen.getByText(/photo\.jpg.*sent successfully/i)).toBeTruthy();
    });

    it("renders 'Send Another File' button", () => {
        render(<TransferCompleteState fileName="file.txt" onReset={onReset} />);
        expect(screen.getByRole("button", { name: /send another file/i })).toBeTruthy();
    });

    it("calls onReset when 'Send Another File' is clicked", () => {
        render(<TransferCompleteState fileName="file.txt" onReset={onReset} />);
        fireEvent.click(screen.getByRole("button", { name: /send another file/i }));
        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it("shows check icon", () => {
        render(<TransferCompleteState fileName="file.txt" onReset={onReset} />);
        expect(screen.getByText("check")).toBeTruthy();
    });
});
