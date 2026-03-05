import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RadarVisualizer from "../radar-visualizer";

describe("RadarVisualizer", () => {
    it("renders without crashing", () => {
        const { container } = render(<RadarVisualizer status="idle" />);
        expect(container.firstChild).toBeTruthy();
    });

    it("shows 'Scanning...' badge when status is idle", () => {
        render(<RadarVisualizer status="idle" />);
        expect(screen.getByText("Scanning...")).toBeTruthy();
    });

    it("shows 'System Ready' badge when status is idle and peer is ready", () => {
        render(<RadarVisualizer status="idle" isPeerReady={true} />);
        expect(screen.getByText("System Ready")).toBeTruthy();
    });

    it("shows 'Signal Detected' badge when status is offering", () => {
        render(<RadarVisualizer status="offering" />);
        expect(screen.getByText("Signal Detected")).toBeTruthy();
    });

    it("shows 'Link Active' badge when status is transferring", () => {
        render(<RadarVisualizer status="transferring" />);
        expect(screen.getByText("Link Active")).toBeTruthy();
    });
});
