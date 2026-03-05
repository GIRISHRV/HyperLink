import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RadarVisualizer from "../radar-visualizer";

describe("RadarVisualizer", () => {
    it("renders without crashing", () => {
        const { container } = render(<RadarVisualizer status="idle" />);
        expect(container.firstChild).toBeTruthy();
    });

    it("shows 'Waiting for connection...' when status is idle", () => {
        render(<RadarVisualizer status="idle" />);
        expect(screen.getByText("Waiting for connection...")).toBeTruthy();
    });

    it("shows 'Incoming File Offer' when status is offering", () => {
        render(<RadarVisualizer status="offering" />);
        expect(screen.getByText("Incoming File Offer")).toBeTruthy();
    });

    it("shows 'Receiving Data...' when status is transferring", () => {
        render(<RadarVisualizer status="transferring" />);
        expect(screen.getByText("Receiving Data...")).toBeTruthy();
    });

    it("shows 'Transfer Paused' when status is paused", () => {
        render(<RadarVisualizer status="paused" />);
        expect(screen.getByText("Transfer Paused")).toBeTruthy();
    });

    it("shows 'Transfer Complete!' when status is complete", () => {
        render(<RadarVisualizer status="complete" />);
        expect(screen.getByText("Transfer Complete!")).toBeTruthy();
    });

    it("shows 'Transfer Cancelled' when status is cancelled", () => {
        render(<RadarVisualizer status="cancelled" />);
        expect(screen.getByText("Transfer Cancelled")).toBeTruthy();
    });

    it("shows 'Radar Active' badge", () => {
        render(<RadarVisualizer status="idle" />);
        expect(screen.getByText("Radar Active")).toBeTruthy();
    });
});
