"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/context/SocketContext";

export interface ChatMessage {
  id: string;
  username: string;
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
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;

    // Listeners setup FIRST (fixes race condition)
    
    // Listen for join confirmation
    const onJoined = (data: { roomId: string }) => {
      if (data.roomId === roomId) {
        setIsJoined(true);
        joinedRef.current = true;
      }
    };

    // Incoming chat messages from others
    const onMessage = (data: { username: string; text: string; at: number }) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), username: data.username, text: data.text, at: data.at },
      ]);
    };

    // User joined notification
    const onUserJoined = (data: { username: string }) => {
      setSystemMessages((prev) => [
        ...prev,
        { id: nextId(), text: `${data.username} joined`, at: Date.now() },
      ]);
    };

    // User left notification
    const onUserLeft = (data: { username: string }) => {
      setSystemMessages((prev) => [
        ...prev,
        { id: nextId(), text: `${data.username} left`, at: Date.now() },
      ]);
    };

    // Error handler with retry logic for failed joins
    const onError = (data: { code: string }) => {
      if (data.code === "JOIN_FAILED" || data.code === "INVALID_ROOM_ID") {
        // Retry join once after 1 second
        setTimeout(() => {
          if (socket.connected) {
            socket.emit("room:join", { roomId });
          }
        }, 1000);
      }
    };

    socket.on("room:joined", onJoined);
    socket.on("room:message", onMessage);
    socket.on("room:user_joined", onUserJoined);
    socket.on("room:user_left", onUserLeft);
    socket.on("room:error", onError);

    // Socket is connected and listeners attached — join now
    socket.emit("room:join", { roomId });

    return () => {
      // Leave room on unmount
      if (joinedRef.current) {
        socket.emit("room:leave", { roomId });
      }
      socket.off("room:joined", onJoined);
      socket.off("room:message", onMessage);
      socket.off("room:user_joined", onUserJoined);
      socket.off("room:user_left", onUserLeft);
      socket.off("room:error", onError);
      setIsJoined(false);
      joinedRef.current = false;
    };
  }, [socket, isConnected, roomId]);

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
          username: "You",
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
