"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const MAX_ALIAS_LENGTH = 40;

interface CreateRoomModalProps {
  coords: { lat: number; lng: number };
  token: string;
  onClose: () => void;
  isOpen: boolean;
}

export default function CreateRoomModal({
  coords,
  token,
  onClose,
  isOpen,
}: CreateRoomModalProps) {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmed = alias.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alias: trimmed,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create room");
      }

      const data = await res.json();
      const roomId = data.room?._id;
      if (roomId) {
        router.push(`/room/${roomId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const remaining = MAX_ALIAS_LENGTH - alias.length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-[#111119] border border-[#1e1e2e] shadow-2xl shadow-violet-500/5 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-100">
              Create a Room
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#1e1e2e] transition-all"
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
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Start a conversation near you. Rooms are ephemeral — they
            disappear when empty.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4">
          <div className="relative">
            <input
              type="text"
              value={alias}
              onChange={(e) =>
                setAlias(e.target.value.slice(0, MAX_ALIAS_LENGTH))
              }
              placeholder="Give your room a vibe..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-[#2a2a3e] text-gray-100 text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono ${
                remaining <= 5
                  ? "text-red-400"
                  : remaining <= 15
                  ? "text-yellow-500"
                  : "text-gray-600"
              }`}
            >
              {remaining}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-900/10 border border-red-800/20 rounded-lg px-3 py-2">
              <svg
                className="w-3.5 h-3.5 shrink-0"
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
              {error}
            </div>
          )}

          {/* Location indicator */}
          <div className="flex items-center gap-2 mt-4 mb-5">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-40" />
            </div>
            <span className="text-[11px] text-gray-500">
              Room will be pinned to your current location
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!alias.trim() || isSubmitting}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium transition-all duration-200 active:scale-[0.98] shadow-lg shadow-violet-600/20 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Create & Enter
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
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
