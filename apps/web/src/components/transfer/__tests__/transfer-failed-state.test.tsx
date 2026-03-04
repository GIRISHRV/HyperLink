import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TransferFailedState from "@/components/transfer/transfer-failed-state";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/utils/notification", () => ({
    isSecureContext: () => true,
}));

function makePeerRef(state = "connected") {
    return { current: { getState: () => state } } as any;
}

describe("TransferFailedState", () => {
    const onRetry = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        const { container } = render(
            <TransferFailedState error="Timeout" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        expect(container.firstChild).not.toBeNull();
    });

    it("shows 'Transfer Failed' heading", () => {
        render(
            <TransferFailedState error="Timeout" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        expect(screen.getByText(/transfer failed/i)).toBeTruthy();
    });

    it("shows the error message", () => {
        render(
            <TransferFailedState error="Connection timed out" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        expect(screen.getByText("Connection timed out")).toBeTruthy();
    });

    it("shows 'Unknown error occurred' when error is empty", () => {
        render(
            <TransferFailedState error="" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        expect(screen.getByText("Unknown error occurred")).toBeTruthy();
    });

    it("renders 'Try Again' button", () => {
        render(
            <TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
    });

    it("renders 'Return to Home' button", () => {
        render(
            <TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        expect(screen.getByRole("button", { name: /return to home/i })).toBeTruthy();
    });

    it("calls onRetry when 'Try Again' is clicked", () => {
        render(
            <TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        fireEvent.click(screen.getByRole("button", { name: /try again/i }));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("navigates to /dashboard when 'Return to Home' is clicked", () => {
        render(
            <TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        fireEvent.click(screen.getByRole("button", { name: /return to home/i }));
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("shows SECURE_CONTEXT diagnostic row", () => {
        render(
            <TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        expect(screen.getByText("SECURE_CONTEXT:")).toBeTruthy();
    });

    it("shows NETWORK_STATUS diagnostic row", () => {
        render(
            <TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />
        );
        expect(screen.getByText("NETWORK_STATUS:")).toBeTruthy();
    });
});
