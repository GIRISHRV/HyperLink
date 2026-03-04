import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { DataMovedCard } from "@/components/stats/data-moved-card";

vi.mock("@/lib/hooks/use-transfer-stats", () => ({
    useTransferStats: vi.fn(),
}));

vi.mock("@repo/utils", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@repo/utils")>();
    return { ...actual, formatFileSize: (n: number) => (n === 0 ? "0 B" : `${n} B`) };
});

import { useTransferStats } from "@/lib/hooks/use-transfer-stats";

describe("DataMovedCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders skeleton when isLoading is true", () => {
        (useTransferStats as ReturnType<typeof vi.fn>).mockReturnValue({
            totalBytes: 0,
            totalTransfers: 0,
            isLoading: true,
        });

        const { container } = render(<DataMovedCard userId="user-1" />);
        expect(container.querySelector(".animate-pulse")).not.toBeNull();
    });

    it("renders the total bytes formatted value", () => {
        (useTransferStats as ReturnType<typeof vi.fn>).mockReturnValue({
            totalBytes: 1024,
            totalTransfers: 5,
            isLoading: false,
        });

        render(<DataMovedCard userId="user-1" />);
        // formatFileSize(1024) → "1024 B" → number part = "1024", unit = "B"
        expect(screen.getByText("1024")).toBeTruthy();
        expect(screen.getByText("B")).toBeTruthy();
    });

    it("shows the transfer count", () => {
        (useTransferStats as ReturnType<typeof vi.fn>).mockReturnValue({
            totalBytes: 512,
            totalTransfers: 7,
            isLoading: false,
        });

        render(<DataMovedCard userId="user-1" />);
        expect(screen.getByText(/across 7 successful transfers/i)).toBeTruthy();
    });

    it("shows 'Total Data Moved' label", () => {
        (useTransferStats as ReturnType<typeof vi.fn>).mockReturnValue({
            totalBytes: 0,
            totalTransfers: 0,
            isLoading: false,
        });

        render(<DataMovedCard userId="user-1" />);
        expect(screen.getByText(/total data moved/i)).toBeTruthy();
    });

    it("does not show skeleton when not loading", () => {
        (useTransferStats as ReturnType<typeof vi.fn>).mockReturnValue({
            totalBytes: 0,
            totalTransfers: 0,
            isLoading: false,
        });

        const { container } = render(<DataMovedCard userId="user-1" />);
        expect(container.querySelector(".animate-pulse")).toBeNull();
    });
});
