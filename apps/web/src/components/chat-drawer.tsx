"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@repo/types";

interface ChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    currentUserId: string; // "me" or peerId
    peerId: string;
}

export default function ChatDrawer({
    isOpen,
    onClose,
    messages,
    onSendMessage,
    currentUserId,
    peerId,
}: ChatDrawerProps) {
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        onSendMessage(inputValue.trim());
        setInputValue("");
    };

    return (
        <div className={`fixed inset-y-0 right-0 w-[400px] z-50 transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
            {/* Glass Panel */}
            <div className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col h-full">

                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">forum</span>
                        <div className="flex flex-col">
                            <h3 className="font-['Space_Grotesk'] font-bold uppercase tracking-wider text-sm text-white leading-none">Secure Link</h3>
                            <span className="text-[10px] text-gray-500 font-mono mt-0.5">PEER: {peerId.slice(0, 8)}...</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors active:scale-95"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                            <span className="material-symbols-outlined text-4xl mb-2">encrypted</span>
                            <p className="text-xs uppercase tracking-widest text-gray-400">End-to-End Encrypted<br />Channel Ready</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === currentUserId;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] rounded-sm p-3 border ${isMe
                                        ? "bg-primary text-black border-primary"
                                        : "bg-white/5 text-white border-white/10"
                                        }`}>
                                        {msg.isSystem ? (
                                            <span className="text-xs font-mono opacity-70 uppercase">{msg.text}</span>
                                        ) : (
                                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                        )}

                                        {!msg.isSystem && (
                                            <p className={`text-[10px] mt-1 opacity-50 uppercase font-mono text-right ${isMe ? "text-black" : "text-gray-400"}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-black/40">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex gap-2"
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type message..."
                            className="flex-1 bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-primary/50 transition-colors placeholder:text-gray-600 font-mono"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="bg-white/5 hover:bg-primary hover:text-black hover:border-primary border border-white/10 text-white p-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
