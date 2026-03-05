import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DragOverlay from "../drag-overlay";

describe("DragOverlay", () => {
    it("renders without crashing", () => {
        const { container } = render(<DragOverlay />);
        expect(container.firstChild).toBeTruthy();
    });

    it("shows 'Drop Payload Here' heading", () => {
        render(<DragOverlay />);
        expect(screen.getByText("Drop Payload Here")).toBeTruthy();
    });

    it("shows transfer sequence message", () => {
        render(<DragOverlay />);
        expect(screen.getByText("Initiating Transfer Sequence")).toBeTruthy();
    });

    it("is fixed-position and full-screen", () => {
        const { container } = render(<DragOverlay />);
        const el = container.firstChild as HTMLElement;
        expect(el.className).toContain("fixed");
        expect(el.className).toContain("inset-0");
    });
});
