import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DiagnosticPanel from "../diagnostic-panel";

vi.mock("@/lib/utils/notification", () => ({
    isSecureContext: vi.fn(() => true),
}));

function makePeerRef(state = "connected") {
    return { current: { getState: () => state } } as never;
}

describe("DiagnosticPanel", () => {
    it("renders the error message", () => {
        render(
            <DiagnosticPanel
                error="Connection failed"
                peerManagerRef={makePeerRef()}
                onClear={vi.fn()}
            />
        );
        expect(screen.getByText("Connection failed")).toBeTruthy();
    });

    it("shows diagnostic data for generic errors", () => {
        render(
            <DiagnosticPanel
                error="Connection failed"
                peerManagerRef={makePeerRef()}
                onClear={vi.fn()}
            />
        );
        expect(screen.getByText("Diagnostic Data")).toBeTruthy();
        expect(screen.getByText("SECURE_CONTEXT:")).toBeTruthy();
        expect(screen.getByText("PEER_STATUS:")).toBeTruthy();
    });

    it("hides diagnostic data for 'Incorrect password' error", () => {
        render(
            <DiagnosticPanel
                error="Incorrect password. The transfer was cancelled."
                peerManagerRef={makePeerRef()}
                onClear={vi.fn()}
            />
        );
        expect(screen.queryByText("Diagnostic Data")).toBeNull();
    });

    it("shows peer state in uppercase", () => {
        render(
            <DiagnosticPanel
                error="Connection failed"
                peerManagerRef={makePeerRef("connected")}
                onClear={vi.fn()}
            />
        );
        expect(screen.getByText("CONNECTED")).toBeTruthy();
    });

    it("calls onClear when 'Clear Error' button is clicked", () => {
        const onClear = vi.fn();
        render(
            <DiagnosticPanel
                error="Connection failed"
                peerManagerRef={makePeerRef()}
                onClear={onClear}
            />
        );
        fireEvent.click(screen.getByText("Clear Error"));
        expect(onClear).toHaveBeenCalledOnce();
    });
});
