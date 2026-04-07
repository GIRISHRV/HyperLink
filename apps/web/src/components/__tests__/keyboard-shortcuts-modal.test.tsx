import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import KeyboardShortcutsModal from "@/components/keyboard-shortcuts-modal";

vi.mock("@/lib/hooks/use-modal-accessibility", () => ({
  useModalAccessibility: () => ({
    modalRef: { current: null },
    handleKeyDown: vi.fn(),
  }),
}));

describe("KeyboardShortcutsModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(<KeyboardShortcutsModal isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog when isOpen is true", () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeTruthy();
  });

  it("displays all keyboard shortcuts", () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText(/new transfer/i)).toBeTruthy();
    expect(screen.getByText(/view history/i)).toBeTruthy();
    expect(screen.getByText(/receive files/i)).toBeTruthy();
    expect(screen.getByText(/show shortcuts/i)).toBeTruthy();
    expect(screen.getByText(/close modal/i)).toBeTruthy();
  });

  it("calls onClose when close button is clicked", () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    const closeButtons = screen.getAllByRole("button");
    const topCloseButton = closeButtons[0]; // X button in top right

    fireEvent.click(topCloseButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when 'Got it' button is clicked", () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    const gotItButton = screen.getByRole("button", { name: /got it/i });
    fireEvent.click(gotItButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows keyboard shortcut keys", () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    // Check for key labels
    expect(screen.getByText("Shift+F1")).toBeTruthy();
    expect(screen.getByText("Shift+F2")).toBeTruthy();
    expect(screen.getByText("Shift+F3")).toBeTruthy();
    expect(screen.getByText("/")).toBeTruthy();
    expect(screen.getByText("Esc")).toBeTruthy();
  });
});
