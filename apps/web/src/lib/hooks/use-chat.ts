import { useState, useCallback } from "react";
import type { ChatMessage } from "@repo/types";
import type { DataConnection } from "peerjs";

export function useChat(userId: string | undefined) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const handleIncomingData = useCallback((data: unknown): boolean => {
    if (
      data !== null &&
      typeof data === "object" &&
      "type" in data &&
      (data as Record<string, unknown>).type === "chat-message"
    ) {
      const payload = (data as Record<string, unknown>).payload as ChatMessage;
      setMessages((prev) => [...prev, payload]);
      setHasUnread(true);
      return true;
    }
    return false;
  }, []);

  const sendMessage = useCallback(
    (
      text: string,
      connection: DataConnection | null,
      transferId: string,
      senderName?: string,
      senderPeerId?: string
    ) => {
      if (!connection || !userId) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: userId,
        senderName,
        senderPeerId,
        text,
        timestamp: Date.now(),
      };
      connection.send({
        type: "chat-message",
        transferId,
        payload: msg,
        timestamp: Date.now(),
      });
      setMessages((prev) => [...prev, msg]);
    },
    [userId]
  );

  const resetChat = useCallback(() => {
    setMessages([]);
    setHasUnread(false);
    setIsChatOpen(false);
  }, []);

  return {
    isChatOpen,
    setIsChatOpen,
    messages,
    hasUnread,
    setHasUnread,
    handleIncomingData,
    sendMessage,
    resetChat,
  };
}
