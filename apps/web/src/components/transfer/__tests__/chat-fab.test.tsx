import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatFAB from "../chat-fab";

describe("ChatFAB", () => {
    it("renders the chat button", () => {
        render(<ChatFAB hasUnread={false} onClick={vi.fn()} />);
        const btn = screen.getByRole("button");
        expect(btn).toBeTruthy();
    });

    it("calls onClick when clicked", () => {
        const onClick = vi.fn();
        render(<ChatFAB hasUnread={false} onClick={onClick} />);
        fireEvent.click(screen.getByRole("button"));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("does not show unread badge when hasUnread is false", () => {
        const { container } = render(<ChatFAB hasUnread={false} onClick={vi.fn()} />);
        // The unread indicator is an absolute span with animate-ping
        expect(container.querySelector(".animate-ping")).toBeNull();
    });

    it("shows unread badge when hasUnread is true", () => {
        const { container } = render(<ChatFAB hasUnread={true} onClick={vi.fn()} />);
        expect(container.querySelector(".animate-ping")).toBeTruthy();
        expect(screen.getByText("!")).toBeTruthy();
    });
});
