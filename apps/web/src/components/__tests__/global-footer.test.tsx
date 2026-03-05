// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlobalFooter } from "@/components/global-footer";

describe("GlobalFooter", () => {
    it("renders the HYPERLINK brand text", () => {
        render(<GlobalFooter />);
        expect(screen.getByText("HYPERLINK")).toBeInTheDocument();
    });

    it("renders the tagline", () => {
        render(<GlobalFooter />);
        expect(screen.getByText("E2E ENCRYPTED P2P TRANSFER")).toBeInTheDocument();
    });

    it("renders a <footer> element", () => {
        const { container } = render(<GlobalFooter />);
        expect(container.querySelector("footer")).toBeInTheDocument();
    });

    it("renders three colored strip divs", () => {
        const { container } = render(<GlobalFooter />);
        // The colorful strip container has three flex-1 children
        const strip = container.querySelector(".flex.h-1.w-full");
        expect(strip?.children.length).toBe(3);
    });
});
