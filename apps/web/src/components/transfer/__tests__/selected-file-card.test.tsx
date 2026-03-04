import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import SelectedFileCard from "@/components/transfer/selected-file-card";

vi.mock("@repo/utils", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@repo/utils")>();
    return { ...actual, formatFileSize: (n: number) => `${n} B` };
});

function makeFile(name: string, size: number, type = "text/plain"): File {
    return new File(["x".repeat(size)], name, { type });
}

describe("SelectedFileCard", () => {
    const onRemove = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        const file = makeFile("document.txt", 512);
        const { container } = render(<SelectedFileCard file={file} onRemove={onRemove} />);
        expect(container.firstChild).not.toBeNull();
    });

    it("shows the filename", () => {
        const file = makeFile("report.pdf", 2048);
        render(<SelectedFileCard file={file} onRemove={onRemove} />);
        expect(screen.getByText("report.pdf")).toBeTruthy();
    });

    it("shows 'Selected Payload' section header", () => {
        const file = makeFile("data.csv", 100);
        render(<SelectedFileCard file={file} onRemove={onRemove} />);
        expect(screen.getByText(/selected payload/i)).toBeTruthy();
    });

    it("shows 'Remove File' button", () => {
        const file = makeFile("image.png", 1024);
        render(<SelectedFileCard file={file} onRemove={onRemove} />);
        expect(screen.getByRole("button", { name: /remove file/i })).toBeTruthy();
    });

    it("calls onRemove when Remove File is clicked", () => {
        const file = makeFile("video.mp4", 4096);
        render(<SelectedFileCard file={file} onRemove={onRemove} />);
        fireEvent.click(screen.getByRole("button", { name: /remove file/i }));
        expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("shows 'Ready for encrypted transfer' notice", () => {
        const file = makeFile("archive.zip", 512);
        render(<SelectedFileCard file={file} onRemove={onRemove} />);
        expect(screen.getByText(/ready for encrypted transfer/i)).toBeTruthy();
    });
});
