import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "../use-chat";
import type { DataConnection } from "peerjs";

const mockConnection = { send: vi.fn() } as unknown as DataConnection;

beforeEach(() => {
  (mockConnection.send as ReturnType<typeof vi.fn>).mockClear();
});

describe("useChat", () => {
  // ── handleIncomingData ─────────────────────────────────────────────────

  describe("handleIncomingData", () => {
    it("returns true, appends message, sets hasUnread for chat-message", () => {
      const { result } = renderHook(() => useChat("user-1"));
      const msg = { id: "m1", senderId: "user-2", text: "hello", timestamp: 1 };

      let returned: boolean;
      act(() => {
        returned = result.current.handleIncomingData({ type: "chat-message", payload: msg });
      });

      expect(returned!).toBe(true);
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(msg);
      expect(result.current.hasUnread).toBe(true);
    });

    it("returns false and ignores non-chat type", () => {
      const { result } = renderHook(() => useChat("user-1"));

      let returned: boolean;
      act(() => {
        returned = result.current.handleIncomingData({ type: "file-offer", payload: {} });
      });

      expect(returned!).toBe(false);
      expect(result.current.messages).toHaveLength(0);
      expect(result.current.hasUnread).toBe(false);
    });

    it("returns false for null", () => {
      const { result } = renderHook(() => useChat("user-1"));

      let returned: boolean;
      act(() => { returned = result.current.handleIncomingData(null); });

      expect(returned!).toBe(false);
    });

    it("returns false for a plain string", () => {
      const { result } = renderHook(() => useChat("user-1"));

      let returned: boolean;
      act(() => { returned = result.current.handleIncomingData("ping"); });

      expect(returned!).toBe(false);
    });

    it("accumulates multiple messages", () => {
      const { result } = renderHook(() => useChat("user-1"));
      const make = (id: string) => ({ id, senderId: "u2", text: id, timestamp: 0 });

      act(() => {
        result.current.handleIncomingData({ type: "chat-message", payload: make("a") });
        result.current.handleIncomingData({ type: "chat-message", payload: make("b") });
        result.current.handleIncomingData({ type: "chat-message", payload: make("c") });
      });

      expect(result.current.messages).toHaveLength(3);
    });
  });

  // ── sendMessage ────────────────────────────────────────────────────────

  describe("sendMessage", () => {
    it("calls connection.send with correct shape and appends to messages", () => {
      const { result } = renderHook(() => useChat("user-1"));

      act(() => {
        result.current.sendMessage("hey there", mockConnection, "transfer-99");
      });

      expect(mockConnection.send).toHaveBeenCalledOnce();
      const sent = (mockConnection.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
      expect(sent.type).toBe("chat-message");
      expect(sent.transferId).toBe("transfer-99");
      const payload = sent.payload as Record<string, unknown>;
      expect(payload.text).toBe("hey there");
      expect(payload.senderId).toBe("user-1");
      expect(typeof payload.id).toBe("string");
      expect(result.current.messages).toHaveLength(1);
      expect((result.current.messages[0] as unknown as Record<string, unknown>).text).toBe("hey there");
    });

    it("does nothing when connection is null", () => {
      const { result } = renderHook(() => useChat("user-1"));

      act(() => { result.current.sendMessage("hi", null, "tid"); });

      expect(mockConnection.send).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);
    });

    it("does nothing when userId is undefined", () => {
      const { result } = renderHook(() => useChat(undefined));

      act(() => { result.current.sendMessage("hi", mockConnection, "tid"); });

      expect(mockConnection.send).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);
    });
  });

  // ── resetChat ──────────────────────────────────────────────────────────

  describe("resetChat", () => {
    it("clears messages, hasUnread, and isChatOpen", () => {
      const { result } = renderHook(() => useChat("user-1"));

      act(() => {
        result.current.handleIncomingData({
          type: "chat-message",
          payload: { id: "1", senderId: "u2", text: "yo", timestamp: 0 },
        });
        result.current.setIsChatOpen(true);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.hasUnread).toBe(true);
      expect(result.current.isChatOpen).toBe(true);

      act(() => { result.current.resetChat(); });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.hasUnread).toBe(false);
      expect(result.current.isChatOpen).toBe(false);
    });
  });

  // ── setHasUnread ───────────────────────────────────────────────────────

  it("setHasUnread can be cleared manually", () => {
    const { result } = renderHook(() => useChat("user-1"));

    act(() => {
      result.current.handleIncomingData({
        type: "chat-message",
        payload: { id: "1", senderId: "u2", text: "hi", timestamp: 0 },
      });
    });
    expect(result.current.hasUnread).toBe(true);

    act(() => { result.current.setHasUnread(false); });
    expect(result.current.hasUnread).toBe(false);
  });
});
