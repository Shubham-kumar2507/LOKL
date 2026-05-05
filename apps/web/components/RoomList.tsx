"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNearbyRooms } from "@/hooks/useNearbyRooms";
import CreateRoomModal from "./CreateRoomModal";

interface RoomListProps {
  coords: { lat: number; lng: number };
  token: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const created = new Date(dateStr).getTime();
  const diffMs = now - created;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function pluralize(count: number, word: string): string {
  return count === 1 ? `${count} ${word}` : `${count} ${word}s`;
}

export default function RoomList({ coords, token }: RoomListProps) {
  const router = useRouter();
  const { rooms, isLoading } = useNearbyRooms(coords);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading && rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-violet-500/60"
              style={{
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500 font-mono">Scanning nearby…</p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center gap-6 py-16">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-violet-500/5 border border-violet-500/10" />
            <div className="absolute inset-3 rounded-full bg-violet-500/5 border border-violet-500/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-violet-500/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-300 font-medium mb-1">No rooms nearby</p>
            <p className="text-sm text-gray-600">
              Be the first to start a conversation.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all duration-200 active:scale-[0.97] shadow-lg shadow-violet-600/20"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Create a Room
          </button>
        </div>
        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          coords={coords}
          token={token}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {rooms.map((room, index) => (
          <button
            key={room._id}
            onClick={() => router.push(`/room/${room._id}`)}
            className="group w-full text-left p-4 rounded-xl bg-[#111119] border border-[#1e1e2e] hover:border-violet-500/30 hover:bg-[#15151f] transition-all duration-200 animate-fade-up"
            style={{
              animationDelay: `${index * 60}ms`,
              animationFillMode: "both",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-mono text-base font-semibold text-gray-100 group-hover:text-violet-300 transition-colors truncate">
                  {room.alias}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1">
                      {Array.from({
                        length: Math.min(room.memberCount, 3),
                      }).map((_, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full bg-violet-600/30 border border-[#0a0a0f] flex items-center justify-center"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {pluralize(room.memberCount, "person")}
                    </span>
                  </div>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-600">
                    {timeAgo(room.createdAt)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/0 group-hover:bg-violet-600/10 transition-all ml-3 mt-1">
                <svg
                  className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-all group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        coords={coords}
        token={token}
      />
    </>
  );
}
