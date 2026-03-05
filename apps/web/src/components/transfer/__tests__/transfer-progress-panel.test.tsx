import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TransferProgressPanel from "../transfer-progress-panel";

vi.mock("@repo/utils", () => ({
    formatFileSize: (b: number) => `${b}B`,
    formatTime: (s: number) => `${s}s`,
}));

const baseProps = {
    peerId: "abcdef1234567890",
    fileName: "payload.tar.gz",
    percentage: 45,
    isPaused: false,
    speed: 1024000,
    timeRemaining: 30,
    onPauseResume: vi.fn(),
    onCancel: vi.fn(),
    direction: "uplink" as const,
};

describe("TransferProgressPanel", () => {
    it("renders without crashing", () => {
        const { container } = render(<TransferProgressPanel {...baseProps} />);
        expect(container.firstChild).toBeTruthy();
    });

    it("shows file name", () => {
        render(<TransferProgressPanel {...baseProps} fileName="my-file.zip" />);
        expect(screen.getByText("my-file.zip")).toBeTruthy();
    });

    it("shows percentage", () => {
        render(<TransferProgressPanel {...baseProps} percentage={73} />);
        expect(screen.getByText("73%")).toBeTruthy();
    });

    it("shows 'Secure Uplink Established' for uplink", () => {
        render(<TransferProgressPanel {...baseProps} direction="uplink" />);
        expect(screen.getByText("Secure Uplink Established")).toBeTruthy();
    });

    it("shows 'Incoming Data Stream' for downlink", () => {
        render(<TransferProgressPanel {...baseProps} direction="downlink" />);
        expect(screen.getByText("Incoming Data Stream")).toBeTruthy();
    });

    it("shows 'Uploading Payload' for uplink", () => {
        render(<TransferProgressPanel {...baseProps} direction="uplink" />);
        expect(screen.getByText("Uploading Payload")).toBeTruthy();
    });

    it("shows 'Receiving Payload' for downlink", () => {
        render(<TransferProgressPanel {...baseProps} direction="downlink" />);
        expect(screen.getByText("Receiving Payload")).toBeTruthy();
    });

    it("calls onPauseResume when pause button is clicked", () => {
        const onPauseResume = vi.fn();
        render(<TransferProgressPanel {...baseProps} onPauseResume={onPauseResume} />);
        // Pause button for active transfer shows "Pause"
        fireEvent.click(screen.getByText("Pause"));
        expect(onPauseResume).toHaveBeenCalledOnce();
    });

    it("shows 'Resume Uplink' button when paused on uplink", () => {
        render(<TransferProgressPanel {...baseProps} isPaused={true} direction="uplink" />);
        expect(screen.getByText("Resume Uplink")).toBeTruthy();
    });

    it("shows 'RESUME DOWNLINK' button when paused on downlink", () => {
        render(<TransferProgressPanel {...baseProps} isPaused={true} direction="downlink" />);
        expect(screen.getByText("RESUME DOWNLINK")).toBeTruthy();
    });

    it("calls onCancel when Abort button is clicked", () => {
        const onCancel = vi.fn();
        render(<TransferProgressPanel {...baseProps} onCancel={onCancel} />);
        fireEvent.click(screen.getByText("Abort"));
        expect(onCancel).toHaveBeenCalledOnce();
    });
});
