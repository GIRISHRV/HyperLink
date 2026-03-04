// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Ripple } from "@/components/ripple";

describe("Ripple", () => {
    it("renders the ripple container div", () => {
        const { container } = render(<Ripple />);
        expect(container.firstChild).toBeInTheDocument();
    });

    it("has aria-hidden set to true", () => {
        const { container } = render(<Ripple />);
        const el = container.querySelector("[aria-hidden='true']");
        expect(el).toBeInTheDocument();
    });

    it("renders no ripple spans initially", () => {
        const { container } = render(<Ripple />);
        expect(container.querySelectorAll("span").length).toBe(0);
    });

    it("adds a ripple span on mousedown", async () => {
        const { container } = render(
            <div style={{ width: 200, height: 200, position: "relative" }}>
                <Ripple />
            </div>
        );
        const rippleEl = container.querySelector("[aria-hidden='true']") as HTMLElement;
        await userEvent.pointer({ target: rippleEl, keys: "[MouseLeft>]" });
        expect(container.querySelectorAll("span").length).toBeGreaterThan(0);
    });

    it("applies custom background color to ripple spans", async () => {
        const { container } = render(
            <div style={{ width: 100, height: 100, position: "relative" }}>
                <Ripple color="rgba(255,0,0,0.5)" />
            </div>
        );
        const rippleEl = container.querySelector("[aria-hidden='true']") as HTMLElement;
        await userEvent.pointer({ target: rippleEl, keys: "[MouseLeft>]" });
        const span = container.querySelector("span");
        // The browser normalises shorthand rgba → rgba(r, g, b, a) with spaces
        expect(span?.style.backgroundColor).toBe("rgba(255, 0, 0, 0.5)");
    });

    it("applies custom duration to ripple spans", async () => {
        const { container } = render(
            <div style={{ width: 100, height: 100, position: "relative" }}>
                <Ripple duration={400} />
            </div>
        );
        const rippleEl = container.querySelector("[aria-hidden='true']") as HTMLElement;
        await userEvent.pointer({ target: rippleEl, keys: "[MouseLeft>]" });
        const span = container.querySelector("span");
        expect(span?.style.animationDuration).toBe("400ms");
    });

    it("accumulates multiple ripple spans on repeated clicks", async () => {
        const { container } = render(
            <div style={{ width: 200, height: 200, position: "relative" }}>
                <Ripple />
            </div>
        );
        const rippleEl = container.querySelector("[aria-hidden='true']") as HTMLElement;
        await userEvent.pointer({ target: rippleEl, keys: "[MouseLeft>]" });
        await userEvent.pointer({ target: rippleEl, keys: "[MouseLeft>]" });
        expect(container.querySelectorAll("span").length).toBe(2);
    });
});
