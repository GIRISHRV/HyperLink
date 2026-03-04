import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ClipboardListener } from "@/components/clipboard-listener";

const mockPush = vi.fn();
let capturedClipboardCallback: ((file: File) => void) | null = null;

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => "/dashboard",
}));

vi.mock("@/lib/hooks/use-clipboard-file", () => ({
    useClipboardFile: (cb: (file: File) => void) => {
        capturedClipboardCallback = cb;
    },
}));

vi.mock("@repo/utils", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@repo/utils")>();
    return { ...actual, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } };
});

function triggerPaste(name = "screenshot.png") {
    act(() => {
        capturedClipboardCallback?.(new File([""], name, { type: "image/png" }));
    });
}

describe("ClipboardListener", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedClipboardCallback = null;
    });

    it("renders nothing initially (no paste detected)", () => {
        const { container } = render(<ClipboardListener />);
        // Portal is empty before any file is pasted
        expect(screen.queryByText(/clipboard detected/i)).toBeNull();
        expect(container.firstChild).toBeNull();
    });

    it("shows toast after a file is pasted", () => {
        render(<ClipboardListener />);
        triggerPaste("image.png");
        expect(screen.getByText(/clipboard detected/i)).toBeTruthy();
    });

    it("shows the pasted filename in the toast", () => {
        render(<ClipboardListener />);
        triggerPaste("my-photo.jpg");
        expect(screen.getByText("my-photo.jpg")).toBeTruthy();
    });

    it("renders 'Go to Send' button in toast", () => {
        render(<ClipboardListener />);
        triggerPaste();
        expect(screen.getByRole("button", { name: /go to send/i })).toBeTruthy();
    });

    it("renders dismiss button in toast", () => {
        render(<ClipboardListener />);
        triggerPaste();
        expect(screen.getByRole("button", { name: /dismiss notification/i })).toBeTruthy();
    });

    it("calls router.push('/send') when Go to Send is clicked", () => {
        render(<ClipboardListener />);
        triggerPaste();
        fireEvent.click(screen.getByRole("button", { name: /go to send/i }));
        expect(mockPush).toHaveBeenCalledWith("/send");
    });

    it("hides the toast when dismiss button is clicked", () => {
        render(<ClipboardListener />);
        triggerPaste();
        expect(screen.getByText(/clipboard detected/i)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /dismiss notification/i }));
        expect(screen.queryByText(/clipboard detected/i)).toBeNull();
    });

});
