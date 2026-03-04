// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/empty-state";

// next/link renders an <a> in jsdom
vi.mock("next/link", () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

describe("EmptyState", () => {
    it("renders the title", () => {
        render(<EmptyState title="No files" description="Upload something" />);
        expect(screen.getByText("No files")).toBeInTheDocument();
    });

    it("renders the description", () => {
        render(<EmptyState title="No files" description="Upload something" />);
        expect(screen.getByText("Upload something")).toBeInTheDocument();
    });

    it("renders default icon 'inbox' via material symbol span", () => {
        const { container } = render(
            <EmptyState title="No files" description="desc" />
        );
        const iconEl = container.querySelector(".material-symbols-outlined");
        expect(iconEl?.textContent?.trim()).toBe("inbox");
    });

    it("renders a custom icon when provided", () => {
        const { container } = render(
            <EmptyState icon="folder" title="Empty folder" description="desc" />
        );
        const iconEl = container.querySelector(".material-symbols-outlined");
        expect(iconEl?.textContent?.trim()).toBe("folder");
    });

    it("does not render a CTA button when actionLabel/actionLink are absent", () => {
        render(<EmptyState title="No files" description="desc" />);
        expect(screen.queryByRole("link")).toBeNull();
    });

    it("renders an action link when actionLabel and actionLink are provided", () => {
        render(
            <EmptyState
                title="No files"
                description="desc"
                actionLabel="Go send"
                actionLink="/send"
            />
        );
        const link = screen.getByRole("link");
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/send");
        expect(link).toHaveTextContent("Go send");
    });

    it("renders action link text correctly", () => {
        render(
            <EmptyState
                title="Empty"
                description="desc"
                actionLabel="Start Transfer"
                actionLink="/send"
            />
        );
        expect(screen.getByText("Start Transfer")).toBeInTheDocument();
    });
});
