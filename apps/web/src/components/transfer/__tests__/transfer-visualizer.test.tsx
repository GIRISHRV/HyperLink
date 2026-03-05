import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TransferVisualizer from "../transfer-visualizer";

describe("TransferVisualizer", () => {
    it("renders without crashing (uplink)", () => {
        const { container } = render(<TransferVisualizer isPaused={false} direction="uplink" />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders without crashing (downlink)", () => {
        const { container } = render(<TransferVisualizer isPaused={false} direction="downlink" />);
        expect(container.firstChild).toBeTruthy();
    });

    it("shows 'Uplink Active' for uplink direction", () => {
        render(<TransferVisualizer isPaused={false} direction="uplink" />);
        expect(screen.getByText("Uplink Active")).toBeTruthy();
    });

    it("shows 'Downlink Active' for downlink direction", () => {
        render(<TransferVisualizer isPaused={false} direction="downlink" />);
        expect(screen.getByText("Downlink Active")).toBeTruthy();
    });

    it("shows 'TRANSMISSION HALTED' when paused", () => {
        render(<TransferVisualizer isPaused={true} direction="uplink" />);
        expect(screen.getByText("TRANSMISSION HALTED")).toBeTruthy();
    });

    it("shows 'DATA_STREAM_OUT' when uplink active", () => {
        render(<TransferVisualizer isPaused={false} direction="uplink" />);
        expect(screen.getByText("DATA_STREAM_OUT")).toBeTruthy();
    });

    it("shows 'DATA_STREAM_IN' when downlink active", () => {
        render(<TransferVisualizer isPaused={false} direction="downlink" />);
        expect(screen.getByText("DATA_STREAM_IN")).toBeTruthy();
    });

    it("shows 'E2E_ENCRYPTED' explicitly", () => {
        render(<TransferVisualizer isPaused={false} direction="downlink" />);
        expect(screen.getByText("E2E_ENCRYPTED")).toBeTruthy();
    });

    it("shows upload icon for uplink", () => {
        render(<TransferVisualizer isPaused={false} direction="uplink" />);
        expect(screen.getByText("upload")).toBeTruthy();
    });

    it("shows download icon for downlink", () => {
        render(<TransferVisualizer isPaused={false} direction="downlink" />);
        expect(screen.getByText("download")).toBeTruthy();
    });
});
