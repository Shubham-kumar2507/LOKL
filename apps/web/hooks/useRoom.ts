"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/context/SocketContext";

export interface ChatMessage {
  id: string;
  alias: string;
  text: string;
  at: number;
  isOwn?: boolean;
}

export interface SystemMessage {
  id: string;
  text: string;
  at: number;
}

interface UseRoomReturn {
  messages: ChatMessage[];
  systemMessages: SystemMessage[];
  sendMessage: (text: string) => void;
  isJoined: boolean;
}

let msgCounter = 0;
function nextId(): string {
  return `msg_${Date.now()}_${++msgCounter}`;
}

export function useRoom(roomId: string): UseRoomReturn {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Join the room
    socket.emit("room:join", { roomId });

    // Listen for join confirmation
    const onJoined = (data: { roomId: string }) => {
      if (data.roomId === roomId) {
        setIsJoined(true);
        joinedRef.current = true;
      }
    };

    // Incoming chat messages from others
    const onMessage = (data: { alias: string; text: string; at: number }) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), alias: data.alias, text: data.text, at: data.at },
      ]);
    };

    // User joined notification
    const onUserJoined = (data: { alias: string }) => {
      setSystemMessages((prev) => [
        ...prev,
        { id: nextId(), text: `${data.alias} joined`, at: Date.now() },
      ]);
    };

    // User left notification
    const onUserLeft = (data: { alias: string }) => {
      setSystemMessages((prev) => [
        ...prev,
        { id: nextId(), text: `${data.alias} left`, at: Date.now() },
      ]);
    };

    socket.on("room:joined", onJoined);
    socket.on("room:message", onMessage);
    socket.on("room:user_joined", onUserJoined);
    socket.on("room:user_left", onUserLeft);

    return () => {
      // Leave room on unmount
      if (joinedRef.current) {
        socket.emit("room:leave", { roomId });
      }
      socket.off("room:joined", onJoined);
      socket.off("room:message", onMessage);
      socket.off("room:user_joined", onUserJoined);
      socket.off("room:user_left", onUserLeft);
      setIsJoined(false);
      joinedRef.current = false;
    };
  }, [socket, roomId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!socket || !text.trim()) return;

      const trimmed = text.trim();
      if (trimmed.length > 500) return;

      // Emit to server
      socket.emit("room:message", { roomId, text: trimmed });

      // Add own message locally (optimistic)
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          alias: "You",
          text: trimmed,
          at: Date.now(),
          isOwn: true,
        },
      ]);
    },
    [socket, roomId]
  );

  return { messages, systemMessages, sendMessage, isJoined };
}
