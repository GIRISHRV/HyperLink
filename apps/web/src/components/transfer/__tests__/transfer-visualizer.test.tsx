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

  it("shows 'Sending' for uplink direction", () => {
    render(<TransferVisualizer isPaused={false} direction="uplink" />);
    expect(screen.getByText("Sending")).toBeTruthy();
  });

  it("shows 'Receiving' for downlink direction", () => {
    render(<TransferVisualizer isPaused={false} direction="downlink" />);
    expect(screen.getByText("Receiving")).toBeTruthy();
  });

  it("shows 'Transfer paused' when paused", () => {
    render(<TransferVisualizer isPaused={true} direction="uplink" />);
    expect(screen.getByText("Transfer paused")).toBeTruthy();
  });

  it("shows 'Sending data' when uplink active", () => {
    render(<TransferVisualizer isPaused={false} direction="uplink" />);
    expect(screen.getByText("Sending data")).toBeTruthy();
  });

  it("shows 'Receiving data' when downlink active", () => {
    render(<TransferVisualizer isPaused={false} direction="downlink" />);
    expect(screen.getByText("Receiving data")).toBeTruthy();
  });

  it("shows 'End-to-end encrypted' explicitly", () => {
    render(<TransferVisualizer isPaused={false} direction="downlink" />);
    expect(screen.getByText("End-to-end encrypted")).toBeTruthy();
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
