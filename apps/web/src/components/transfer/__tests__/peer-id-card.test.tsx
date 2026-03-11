import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import PeerIdCard from "@/components/transfer/peer-id-card";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe("PeerIdCard", () => {
  const onCopy = vi.fn();
  const onShowQR = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the peerId value", () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    expect(screen.getByTestId("my-peer-id").textContent).toBe("abc-123");
  });

  it("shows 'Loading...' when peerId is empty string", () => {
    render(<PeerIdCard peerId="" onCopy={onCopy} onShowQR={onShowQR} />);
    expect(screen.getByTestId("my-peer-id").textContent).toBe("Loading...");
  });

  it("renders 'Copy ID' button", () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    expect(screen.getByRole("button", { name: /copy id/i })).toBeTruthy();
  });

  it("renders 'Show QR' button", () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    expect(screen.getByRole("button", { name: /show qr/i })).toBeTruthy();
  });

  it("renders 'Copy Transfer Link' button", () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    expect(screen.getByRole("button", { name: /copy transfer link/i })).toBeTruthy();
  });

  it("calls onCopy when Copy ID is clicked", () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    fireEvent.click(screen.getByRole("button", { name: /copy id/i }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("calls onShowQR when Show QR is clicked", () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    fireEvent.click(screen.getByRole("button", { name: /show qr/i }));
    expect(onShowQR).toHaveBeenCalledTimes(1);
  });

  it("disables Show QR button when peerId is empty", () => {
    render(<PeerIdCard peerId="" onCopy={onCopy} onShowQR={onShowQR} />);
    const qrButton = screen.getByRole("button", { name: /show qr/i });
    expect((qrButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables Copy Transfer Link button when peerId is empty", () => {
    render(<PeerIdCard peerId="" onCopy={onCopy} onShowQR={onShowQR} />);
    const linkButton = screen.getByRole("button", { name: /copy transfer link/i });
    expect((linkButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("copies transfer link to clipboard when Copy Transfer Link is clicked", async () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    const linkButton = screen.getByRole("button", { name: /copy transfer link/i });

    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/send?peerId=abc-123")
      );
    });
  });

  it("shows 'Link Copied!' feedback after copying transfer link", async () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    const linkButton = screen.getByRole("button", { name: /copy transfer link/i });

    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /link copied!/i })).toBeTruthy();
    });
  });

  it("shows 'Your Peer ID' label", () => {
    render(<PeerIdCard peerId="abc-123" onCopy={onCopy} onShowQR={onShowQR} />);
    expect(screen.getByText(/your peer id/i)).toBeTruthy();
  });
});
