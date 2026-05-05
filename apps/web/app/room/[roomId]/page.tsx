"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useRoom, ChatMessage, SystemMessage } from "@/hooks/useRoom";
import { useDM } from "@/hooks/useDM";
import { useSocket, SocketProvider } from "@/context/SocketContext";
import DMRequestModal from "@/components/DMRequestModal";
import DMChat from "@/components/DMChat";
import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  FormEvent,
} from "react";

// ── Time formatter ──────────────────────────────────────
function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Message Bubble (with DM username popover) ──────────────
function MessageBubble({
  msg,
  onDMClick,
}: {
  msg: ChatMessage;
  onDMClick?: (username: string) => void;
}) {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <div
      className={`flex flex-col mb-3 ${
        msg.isOwn ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          msg.isOwn
            ? "bg-violet-600 text-white rounded-br-md"
            : "bg-[#1e1e2e] text-gray-100 rounded-bl-md border border-[#2a2a3e]"
        }`}
      >
        {!msg.isOwn && (
          <div className="relative mb-1">
            <button
              onClick={() => onDMClick && setShowPopover((v) => !v)}
              className={`text-xs font-semibold font-mono transition-colors ${
                onDMClick
                  ? "text-violet-400 hover:text-violet-300 cursor-pointer"
                  : "text-violet-400 cursor-default"
              }`}
            >
              {msg.username}
            </button>

            {/* DM Popover */}
            {showPopover && onDMClick && (
              <div className="absolute left-0 top-full mt-1 z-20 animate-scale-in">
                <div className="bg-[#111119] border border-[#2a2a3e] rounded-xl px-3 py-2.5 shadow-xl shadow-black/40 min-w-[180px]">
                  <p className="text-xs text-gray-400 mb-2">
                    DM <span className="text-violet-400 font-mono font-semibold">{msg.username}</span>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onDMClick(msg.username);
                        setShowPopover(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all active:scale-[0.97]"
                    >
                      <svg
                        className="w-3 h-3"
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
                      Send Request
                    </button>
                    <button
                      onClick={() => setShowPopover(false)}
                      className="px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-[#1e1e2e] transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
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
  );
}

// ── System Message ──────────────────────────────────────
function SystemBanner({ msg }: { msg: SystemMessage }) {
  return (
    <div className="flex justify-center my-2">
      <span className="text-xs text-gray-500 italic bg-[#12121a] border border-[#1e1e2e] rounded-full px-3 py-1">
        {msg.text}
      </span>
    </div>
  );
}

// ── Chat Area (needs socket context) ────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function ChatRoom({ roomId }: { roomId: string }) {
  const { socket, isConnected } = useSocket();
  const { messages, systemMessages, sendMessage, isJoined } = useRoom(roomId);
  const { session } = useSession();
  const router = useRouter();
  const [roomAlias, setRoomAlias] = useState<string | null>(null);

  // Fetch room alias on mount
  useEffect(() => {
    fetch(`${API_URL}/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.room?.alias) setRoomAlias(data.room.alias);
      })
      .catch(() => {});
  }, [roomId]);

  // DM hook
  const {
    pendingRequest,
    activeDM,
    dmMessages,
    requestDM,
    acceptDM,
    rejectDM,
    sendDM,
    closeDM,
    dmStatus,
    dmError,
  } = useDM();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Merge and sort all messages by time
  type TimelineItem =
    | { kind: "chat"; data: ChatMessage }
    | { kind: "system"; data: SystemMessage };

  const timeline: TimelineItem[] = [
    ...messages.map((m) => ({ kind: "chat" as const, data: m })),
    ...systemMessages.map((m) => ({ kind: "system" as const, data: m })),
  ].sort((a, b) => a.data.at - b.data.at);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length]);

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
    sendMessage(input);
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

  const handleDMClick = (username: string) => {
    requestDM(username, roomId);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white">
      {/* ── Top Bar ──────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0f0f1a] border-b border-[#1e1e2e] shrink-0">
        <button
          onClick={() => router.push("/")}
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        <div className="flex flex-col items-center">
          <h1 className="text-sm font-semibold text-gray-200 truncate max-w-[200px]">
            {roomAlias || "Room"}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected && isJoined
                  ? "bg-emerald-400"
                  : isConnected
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-red-400 animate-pulse"
              }`}
            />
            <span className="text-[10px] text-gray-500">
              {isConnected
                ? isJoined
                  ? "Connected"
                  : "Joining…"
                : "Reconnecting…"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-600/30 flex items-center justify-center">
            <span className="text-xs font-bold text-violet-400">
              {session?.username?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-gray-400">You are</p>
            <p className="text-xs font-semibold text-violet-400 truncate max-w-[120px]">
              {session?.username || "…"}
            </p>
          </div>
        </div>
      </header>

      {/* ── DM Status Toast ──────────────────────────── */}
      {dmError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
          <div className="bg-red-900/80 border border-red-700/50 text-red-200 text-xs rounded-lg px-4 py-2 shadow-lg backdrop-blur-sm">
            {dmError}
          </div>
        </div>
      )}

      {dmStatus === "requesting" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
          <div className="bg-violet-900/80 border border-violet-700/50 text-violet-200 text-xs rounded-lg px-4 py-2 shadow-lg backdrop-blur-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            Sending DM request…
          </div>
        </div>
      )}

      {/* ── Messages Area ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {timeline.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <svg
              className="w-12 h-12 mb-3 opacity-30"
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
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to say something!</p>
          </div>
        )}

        {timeline.map((item) =>
          item.kind === "system" ? (
            <SystemBanner key={item.data.id} msg={item.data} />
          ) : (
            <MessageBubble
              key={item.data.id}
              msg={item.data}
              onDMClick={item.data.isOwn ? undefined : handleDMClick}
            />
          )
        )}
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
            placeholder="Type a message…"
            rows={1}
            maxLength={500}
            className="flex-1 resize-none rounded-xl bg-[#1a1a28] border border-[#2a2a3e] text-sm text-gray-100 placeholder-gray-600 px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || !isConnected}
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
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* ── DM Request Modal ─────────────────────────── */}
      {pendingRequest && (
        <DMRequestModal
          request={pendingRequest}
          onAccept={acceptDM}
          onReject={rejectDM}
        />
      )}

      {/* ── DM Chat Panel ────────────────────────────── */}
      {activeDM && (
        <DMChat
          activeDM={activeDM}
          messages={dmMessages}
          onSend={sendDM}
          onClose={closeDM}
          dmStatus={dmStatus}
        />
      )}
    </div>
  );
}

// ── Page Component ──────────────────────────────────────
export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/login"); // Secure redirection
    }
  }, [isLoading, session, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Initializing session…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect via the useEffect
  }

  return (
    <SocketProvider token={session.token}>
      <ChatRoom roomId={roomId} />
    </SocketProvider>
  );
}
