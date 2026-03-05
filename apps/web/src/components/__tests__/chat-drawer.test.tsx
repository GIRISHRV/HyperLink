import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatDrawer from "../chat-drawer";
import type { ChatMessage } from "@repo/types";

// jsdom does not implement scrollIntoView
beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: "msg-1",
        senderId: "me",
        text: "Hello",
        timestamp: Date.now(),
        isSystem: false,
        ...overrides,
    };
}

const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    messages: [],
    onSendMessage: vi.fn(),
    currentUserId: "me",
    peerId: "peer-abc-def-123",
};

describe("ChatDrawer", () => {
    it("renders when open", () => {
        const { container } = render(<ChatDrawer {...baseProps} />);
        expect(container.firstChild).toBeTruthy();
    });

    it("shows 'Secure Link' header", () => {
        render(<ChatDrawer {...baseProps} />);
        expect(screen.getByText("Secure Link")).toBeTruthy();
    });

    it("shows truncated peer ID in header", () => {
        render(<ChatDrawer {...baseProps} peerId="peer-abc-def-123" />);
        expect(screen.getByText(/PEER: peer-abc/)).toBeTruthy();
    });

    it("calls onClose when close button is clicked", () => {
        const onClose = vi.fn();
        render(<ChatDrawer {...baseProps} onClose={onClose} />);
        fireEvent.click(screen.getByLabelText("Close chat"));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("shows empty state when no messages", () => {
        render(<ChatDrawer {...baseProps} messages={[]} />);
        expect(screen.getByText(/End-to-End Encrypted/i)).toBeTruthy();
    });

    it("renders messages when provided", () => {
        const messages = [makeMsg({ text: "Hello there!" })];
        render(<ChatDrawer {...baseProps} messages={messages} />);
        expect(screen.getByText("Hello there!")).toBeTruthy();
    });

    it("renders system messages in mono style", () => {
        const messages = [makeMsg({ text: "Connected to peer", isSystem: true })];
        render(<ChatDrawer {...baseProps} messages={messages} />);
        expect(screen.getByText("Connected to peer")).toBeTruthy();
    });

    it("calls onSendMessage when form is submitted", () => {
        const onSendMessage = vi.fn();
        render(<ChatDrawer {...baseProps} onSendMessage={onSendMessage} />);
        const input = screen.getByPlaceholderText("Type message...");
        fireEvent.change(input, { target: { value: "Test message" } });
        fireEvent.submit(input.closest("form")!);
        expect(onSendMessage).toHaveBeenCalledWith("Test message");
    });

    it("clears input after sending", () => {
        render(<ChatDrawer {...baseProps} />);
        const input = screen.getByPlaceholderText("Type message...") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "Test" } });
        fireEvent.submit(input.closest("form")!);
        expect(input.value).toBe("");
    });

    it("does not call onSendMessage when input is empty/whitespace", () => {
        const onSendMessage = vi.fn();
        render(<ChatDrawer {...baseProps} onSendMessage={onSendMessage} />);
        const input = screen.getByPlaceholderText("Type message...");
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.submit(input.closest("form")!);
        expect(onSendMessage).not.toHaveBeenCalled();
    });

    it("send button is disabled when input is empty", () => {
        render(<ChatDrawer {...baseProps} />);
        const sendBtn = screen.getByLabelText("Send message") as HTMLButtonElement;
        expect(sendBtn.disabled).toBe(true);
    });

    it("is hidden when isOpen is false (translated off-screen)", () => {
        const { container } = render(<ChatDrawer {...baseProps} isOpen={false} />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain("translate-x-full");
    });
});
