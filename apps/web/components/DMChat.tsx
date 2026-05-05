"use client";

import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  FormEvent,
} from "react";
import { ActiveDM, DMMessage } from "@/hooks/useDM";

interface DMChatProps {
  activeDM: ActiveDM;
  messages: DMMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  dmStatus: "idle" | "requesting" | "waiting_keys" | "ready";
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DMChat({
  activeDM,
  messages,
  onSend,
  onClose,
  dmStatus,
}: DMChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isReady = dmStatus === "ready";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0a12] animate-slide-in-right">
      {/* ── Header ───────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0f0f1a] border-b border-[#1e1e2e] shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Close
        </button>

        <div className="flex flex-col items-center">
          <h1 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-full bg-violet-600/30 flex items-center justify-center text-xs font-bold text-violet-400">
              {activeDM.peerAlias.charAt(0)}
            </span>
            {activeDM.peerAlias}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <svg
              className="w-3 h-3 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <span className="text-[10px] text-emerald-400/80">
              End-to-end encrypted
            </span>
          </div>
        </div>

        <div className="w-14" /> {/* Spacer for centering */}
      </header>

      {/* ── Key exchange status ───────────────────────── */}
      {!isReady && (
        <div className="flex items-center justify-center gap-2 py-3 bg-[#0f0f1a]/50 border-b border-[#1e1e2e]">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">
            Establishing encrypted connection…
          </span>
        </div>
      )}

      {/* ── Messages Area ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Encryption notice */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full px-4 py-1.5">
            <svg
              className="w-3.5 h-3.5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <span className="text-[11px] text-emerald-400/90">
              Messages are end-to-end encrypted. No one else can read them.
            </span>
          </div>
        </div>

        {messages.length === 0 && isReady && (
          <div className="flex flex-col items-center justify-center h-[60%] text-gray-600">
            <svg
              className="w-10 h-10 mb-3 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">Say hello!</p>
            <p className="text-xs mt-1">Your conversation is private.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col mb-3 ${
              msg.isOwn ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.isOwn
                  ? "bg-violet-600 text-white rounded-br-md"
                  : msg.failed
                  ? "bg-red-900/20 text-red-300 rounded-bl-md border border-red-800/30"
                  : "bg-[#1e1e2e] text-gray-100 rounded-bl-md border border-[#2a2a3e]"
              }`}
            >
              {!msg.isOwn && !msg.failed && (
                <p className="text-xs font-semibold text-violet-400 mb-1">
                  {msg.alias}
                </p>
              )}
              {msg.failed && (
                <div className="flex items-center gap-1 mb-1">
                  <svg
                    className="w-3 h-3 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                    />
                  </svg>
                  <span className="text-[10px] text-red-400">
                    Decryption failed
                  </span>
                </div>
              )}
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {msg.text}
              </p>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 px-1">
              {formatTime(msg.at)}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 bg-[#0f0f1a] border-t border-[#1e1e2e]">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isReady ? "Type a private message…" : "Waiting for encryption…"
            }
            disabled={!isReady}
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none rounded-xl bg-[#1a1a28] border border-[#2a2a3e] text-sm text-gray-100 placeholder-gray-600 px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || !isReady}
            className="shrink-0 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white flex items-center justify-center transition-all duration-150 active:scale-95"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        </form>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <svg
            className="w-3 h-3 text-emerald-500/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <span className="text-[10px] text-gray-600">
            🔒 End-to-end encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
