import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import FilePreviewModal from "@/components/file-preview-modal";

// Mock Ripple to avoid complexity
vi.mock("@/components/ripple", () => ({
    Ripple: () => null,
}));

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
    useModalAccessibility: () => ({
        modalRef: { current: null },
        handleKeyDown: vi.fn(),
    }),
}));

// Mock URL.createObjectURL / revokeObjectURL (not available in jsdom)
const mockObjectUrl = "blob:mock-url-1234";
globalThis.URL.createObjectURL = vi.fn(() => mockObjectUrl);
globalThis.URL.revokeObjectURL = vi.fn();

function makeFile(type: string): Blob {
    return new Blob(["content"], { type });
}

describe("FilePreviewModal", () => {
    const onClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue(mockObjectUrl);
    });

    it("renders nothing when isOpen is false", () => {
        const file = makeFile("image/png");
        const { container } = render(
            <FilePreviewModal isOpen={false} onClose={onClose} file={file} filename="test.png" />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders dialog when isOpen is true", async () => {
        const file = makeFile("image/png");
        await act(async () => {
            render(<FilePreviewModal isOpen={true} onClose={onClose} file={file} filename="test.png" />);
        });
        expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("shows the filename in the header", async () => {
        const file = makeFile("image/png");
        await act(async () => {
            render(<FilePreviewModal isOpen={true} onClose={onClose} file={file} filename="photo.png" />);
        });
        expect(screen.getByText("photo.png")).toBeTruthy();
    });

    it("renders an <img> element for image files", async () => {
        const file = makeFile("image/jpeg");
        await act(async () => {
            render(<FilePreviewModal isOpen={true} onClose={onClose} file={file} filename="pic.jpg" />);
        });
        const img = document.querySelector("img");
        expect(img).not.toBeNull();
        expect(img!.src).toBe(mockObjectUrl);
    });

    it("renders a <video> element for video files", async () => {
        const file = makeFile("video/mp4");
        await act(async () => {
            render(<FilePreviewModal isOpen={true} onClose={onClose} file={file} filename="clip.mp4" />);
        });
        const video = document.querySelector("video");
        expect(video).not.toBeNull();
    });

    it("shows 'Preview not available' for unsupported file types", async () => {
        const file = makeFile("application/pdf");
        await act(async () => {
            render(<FilePreviewModal isOpen={true} onClose={onClose} file={file} filename="doc.pdf" />);
        });
        expect(screen.getByText(/Preview not available/i)).toBeTruthy();
    });

    it("shows a download link with the correct filename", async () => {
        const file = makeFile("image/png");
        await act(async () => {
            render(<FilePreviewModal isOpen={true} onClose={onClose} file={file} filename="shot.png" />);
        });
        const downloadLink = document.querySelector("a[download]") as HTMLAnchorElement;
        expect(downloadLink).not.toBeNull();
        expect(downloadLink.download).toBe("shot.png");
    });

    it("calls onClose when close button is clicked", async () => {
        const file = makeFile("image/png");
        await act(async () => {
            render(<FilePreviewModal isOpen={true} onClose={onClose} file={file} filename="test.png" />);
        });
        const closeBtn = document.querySelector("button");
        expect(closeBtn).not.toBeNull();
        fireEvent.click(closeBtn!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls URL.createObjectURL when opened", async () => {
        const file = makeFile("image/png");
        await act(async () => {
            render(<FilePreviewModal isOpen={true} onClose={onClose} file={file} filename="test.png" />);
        });
        expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(file);
    });
});
