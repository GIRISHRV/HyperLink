import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TerminalLog from "../terminal-log";

describe("TerminalLog", () => {
    it("renders an empty log without crashing", () => {
        const { container } = render(<TerminalLog logs={[]} />);
        expect(container.firstChild).toBeTruthy();
    });

    it("renders each log entry", () => {
        const logs = ["Initializing WebRTC handshake...", "Waiting for peer connection..."];
        render(<TerminalLog logs={logs} />);
        expect(screen.getByText("Initializing WebRTC handshake...")).toBeTruthy();
        expect(screen.getByText("Waiting for peer connection...")).toBeTruthy();
    });

    it("renders all log entries when there are many", () => {
        const logs = Array.from({ length: 10 }, (_, i) => `Log entry ${i + 1}`);
        render(<TerminalLog logs={logs} />);
        logs.forEach(log => {
            expect(screen.getByText(log)).toBeTruthy();
        });
    });

    it("renders a blinking cursor element", () => {
        const { container } = render(<TerminalLog logs={["test"]} />);
        // The cursor is a span with animate-pulse
        const cursor = container.querySelector("span.animate-pulse");
        expect(cursor).toBeTruthy();
    });
});
