import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CardSkeleton, TableRowSkeleton, ListSkeleton } from "@/components/skeletons";

describe("Skeletons", () => {
    describe("CardSkeleton", () => {
        it("renders without throwing", () => {
            const { container } = render(<CardSkeleton />);
            expect(container.firstChild).not.toBeNull();
        });

        it("has animate-pulse class", () => {
            const { container } = render(<CardSkeleton />);
            expect(container.querySelector(".animate-pulse")).not.toBeNull();
        });
    });

    describe("TableRowSkeleton", () => {
        it("renders a <tr> element", () => {
            const { container } = render(
                <table>
                    <tbody>
                        <TableRowSkeleton />
                    </tbody>
                </table>
            );
            expect(container.querySelector("tr")).not.toBeNull();
        });

        it("has animate-pulse class", () => {
            const { container } = render(
                <table>
                    <tbody>
                        <TableRowSkeleton />
                    </tbody>
                </table>
            );
            expect(container.querySelector(".animate-pulse")).not.toBeNull();
        });
    });

    describe("ListSkeleton", () => {
        it("renders without throwing", () => {
            const { container } = render(<ListSkeleton />);
            expect(container.firstChild).not.toBeNull();
        });

        it("renders 3 list items", () => {
            const { container } = render(<ListSkeleton />);
            // Each item has animate-pulse
            const items = container.querySelectorAll(".animate-pulse");
            expect(items.length).toBe(3);
        });
    });
});
