import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TransferFailedState from "@/components/transfer/transfer-failed-state";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/utils/notification", () => ({
  isSecureContext: () => true,
}));

function makePeerRef(state = "connected") {
  return { current: { getState: () => state } } as any;
}

describe("TransferFailedState", () => {
  const onRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without throwing", () => {
    const { container } = render(
      <TransferFailedState error="Timeout" peerManagerRef={makePeerRef()} onRetry={onRetry} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("shows error title heading", () => {
    render(
      <TransferFailedState error="Timeout" peerManagerRef={makePeerRef()} onRetry={onRetry} />
    );
    // Should show "Connection Timeout" title from error info
    expect(screen.getByText(/connection timeout/i)).toBeTruthy();
  });

  it("shows the error message in diagnostic report", () => {
    render(
      <TransferFailedState
        error="Connection timed out"
        peerManagerRef={makePeerRef()}
        onRetry={onRetry}
      />
    );
    // Error message appears in diagnostic report
    expect(screen.getAllByText("Connection timed out").length).toBeGreaterThan(0);
  });

  it("shows 'Something Went Wrong' for unknown errors", () => {
    render(<TransferFailedState error="" peerManagerRef={makePeerRef()} onRetry={onRetry} />);
    expect(screen.getByText("Something Went Wrong")).toBeTruthy();
  });

  it("renders action button with appropriate text", () => {
    render(
      <TransferFailedState error="timeout" peerManagerRef={makePeerRef()} onRetry={onRetry} />
    );
    // Should show "Retry" for timeout errors (may appear multiple times)
    const retryButtons = screen.getAllByRole("button", { name: /retry/i });
    expect(retryButtons.length).toBeGreaterThan(0);
  });

  it("renders 'Return to Home' button", () => {
    render(<TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />);
    expect(screen.getByRole("button", { name: /return to home/i })).toBeTruthy();
  });

  it("calls onRetry when action button is clicked", () => {
    render(
      <TransferFailedState error="timeout" peerManagerRef={makePeerRef()} onRetry={onRetry} />
    );
    const retryButtons = screen.getAllByRole("button", { name: /retry/i });
    fireEvent.click(retryButtons[0]);
    expect(onRetry).toHaveBeenCalled();
  });

  it("navigates to /dashboard when 'Return to Home' is clicked", () => {
    render(<TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /return to home/i }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("shows SECURE_CONTEXT diagnostic row", () => {
    render(<TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />);
    expect(screen.getByText("SECURE_CONTEXT:")).toBeTruthy();
  });

  it("shows NETWORK_STATUS diagnostic row", () => {
    render(<TransferFailedState error="err" peerManagerRef={makePeerRef()} onRetry={onRetry} />);
    expect(screen.getByText("NETWORK_STATUS:")).toBeTruthy();
  });
});
