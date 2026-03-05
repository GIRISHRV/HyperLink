// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BackgroundGrid from "@/components/background-grid";

describe("BackgroundGrid", () => {
    it("renders the background container immediately", () => {
        const { container } = render(<BackgroundGrid />);
        // Ensure no SSR guard blocks initial render
        expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
    });

    it("is pointer-events-none (non-interactive overlay)", () => {
        const { container } = render(<BackgroundGrid />);
        const el = container.querySelector(".pointer-events-none");
        expect(el).toBeInTheDocument();
    });

    it("has z-0 so it stays behind page content", () => {
        const { container } = render(<BackgroundGrid />);
        const el = container.querySelector(".z-0");
        expect(el).toBeInTheDocument();
    });

    it("renders decorative geometric shapes and labels", () => {
        const { container } = render(<BackgroundGrid />);
        // The background contains several decorative child divs
        const children = container.querySelectorAll(".fixed.inset-0 > *");
        expect(children.length).toBeGreaterThan(5);
        expect(screen.getByText("SYS_01")).toBeInTheDocument();
        expect(screen.getByText("PROTOCOL_v2")).toBeInTheDocument();
    });

    it("registers mousemove listener", () => {
        const addSpy = vi.spyOn(window, "addEventListener");
        const removeSpy = vi.spyOn(window, "removeEventListener");

        const { unmount } = render(<BackgroundGrid />);
        expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));

        unmount();
        expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));

        addSpy.mockRestore();
        removeSpy.mockRestore();
    });
});
