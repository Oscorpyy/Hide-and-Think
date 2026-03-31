"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle } from "lucide-react";
import { ChatMessage } from "@/hooks/useGame";

interface ChatBoxProps {
  messages: ChatMessage[];
  currentPlayerId: string;
  currentPlayerName: string;
  onSendMessage: (text: string) => void;
}

export default function ChatBox({
  messages,
  currentPlayerId,
  currentPlayerName,
  onSendMessage,
}: ChatBoxProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col rounded-xl border border-purple-700/40 bg-[#0f0a1e]/70 backdrop-blur overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-purple-700/30 px-4 py-2">
        <MessageCircle size={16} className="text-fuchsia-400" />
        <span className="text-sm font-semibold uppercase tracking-widest text-purple-300">
          Chat
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[180px] max-h-[260px]">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-purple-500/70 italic pt-6">
            No messages yet…
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.playerId === currentPlayerId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                {!isOwn && (
                  <span className="mb-0.5 text-xs text-purple-400">
                    {msg.playerName}
                  </span>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                    isOwn
                      ? "bg-fuchsia-600/70 text-white"
                      : "bg-purple-800/50 text-purple-100"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="mt-0.5 text-[10px] text-purple-600">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-purple-700/30 px-3 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message as ${currentPlayerName}…`}
          className="flex-1 rounded-lg bg-purple-900/40 px-3 py-1.5 text-sm text-white placeholder-purple-500 outline-none ring-1 ring-purple-700/50 focus:ring-fuchsia-500/70 transition"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="rounded-lg bg-fuchsia-600 p-1.5 text-white transition hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
