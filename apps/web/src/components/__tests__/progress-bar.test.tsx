// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ProgressBar } from "@/components/progress-bar";

const defaultProps = {
    percentage: 0,
    isPaused: false,
    speed: 0,
    formatFileSize: (b: number) => `${b} B`,
    formatTime: (s: number) => `${s}s`,
    timeRemaining: 0,
};

describe("ProgressBar", () => {
    it("renders speed and ETA labels", () => {
        const { getByText } = render(
            <ProgressBar {...defaultProps} speed={1024} timeRemaining={30} />
        );
        expect(getByText(/1024 B\/s/i)).toBeInTheDocument();
        expect(getByText(/30s/i)).toBeInTheDocument();
    });

    it("renders an active (non-paused) progress bar at given percentage", () => {
        const { container } = render(
            <ProgressBar {...defaultProps} percentage={50} />
        );
        const bar = container.querySelector("[style*='width: 50%']");
        expect(bar).toBeInTheDocument();
    });

    it("applies orange color class when paused", () => {
        const { container } = render(
            <ProgressBar {...defaultProps} percentage={40} isPaused={true} />
        );
        const bar = container.querySelector(".bg-orange-400");
        expect(bar).toBeInTheDocument();
    });

    it("applies primary color class when not paused", () => {
        const { container } = render(
            <ProgressBar {...defaultProps} percentage={40} isPaused={false} />
        );
        const bar = container.querySelector(".bg-primary");
        expect(bar).toBeInTheDocument();
    });

    it("calls formatFileSize with the speed value", () => {
        const formatFileSize = vi.fn().mockReturnValue("1 KB");
        render(<ProgressBar {...defaultProps} speed={1024} formatFileSize={formatFileSize} />);
        expect(formatFileSize).toHaveBeenCalledWith(1024);
    });

    it("calls formatTime with timeRemaining value", () => {
        const formatTime = vi.fn().mockReturnValue("5m");
        render(<ProgressBar {...defaultProps} timeRemaining={300} formatTime={formatTime} />);
        expect(formatTime).toHaveBeenCalledWith(300);
    });

    it("renders 0% bar at zero percentage", () => {
        const { container } = render(<ProgressBar {...defaultProps} percentage={0} />);
        const bar = container.querySelector("[style*='width: 0%']");
        expect(bar).toBeInTheDocument();
    });

    it("renders 100% bar at full percentage", () => {
        const { container } = render(<ProgressBar {...defaultProps} percentage={100} />);
        const bar = container.querySelector("[style*='width: 100%']");
        expect(bar).toBeInTheDocument();
    });

    it("does not render shimmer animation when paused", () => {
        const { container } = render(
            <ProgressBar {...defaultProps} percentage={50} isPaused={true} />
        );
        // Shimmer uses wave-shimmer style — should not be present when paused
        expect(container.innerHTML).not.toContain("wave-shimmer");
    });

    it("renders shimmer animation when not paused and percentage > 0", () => {
        const { container } = render(
            <ProgressBar {...defaultProps} percentage={50} isPaused={false} />
        );
        expect(container.innerHTML).toContain("wave-shimmer");
    });
});
