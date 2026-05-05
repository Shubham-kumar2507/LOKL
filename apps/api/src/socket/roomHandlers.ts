import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import {
  incrementMember,
  decrementMember,
} from "../services/roomService";
import { checkContent } from "../utils/moderation";

// ── Extended socket type ─────────────────────────────
export interface AuthenticatedSocket extends Socket {
  user: { userId: string; username: string };
  currentRooms: Set<string>;
  /** Timestamp until which the socket is muted (content policy) */
  mutedUntil?: number;
  /** Number of content policy violations this session */
  contentViolations?: number;
}

// ── Register room event handlers ─────────────────────
export function registerRoomHandlers(
  io: Server,
  socket: AuthenticatedSocket
) {
  // ── room:join ────────────────────────────────────────
  socket.on("room:join", async ({ roomId }: { roomId: string }) => {
    try {
      // 1. Validate roomId
      if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
        socket.emit("room:error", { code: "INVALID_ROOM_ID" });
        return;
      }

      // 2. Join the Socket.io room FIRST (before any DB calls)
      //    This ensures messaging works even if DB is slow/down
      socket.join(roomId);

      // 3. Track for cleanup on disconnect
      socket.currentRooms.add(roomId);

      // 4. Confirm join back to sender IMMEDIATELY
      socket.emit("room:joined", { roomId });

      // 5. Notify others in the room
      socket.to(roomId).emit("room:user_joined", {
        username: socket.user.username,
      });

      // 6. Debug log — shows room membership in real time
      console.log(
        `Socket ${socket.id} (${socket.user.username}) joined room ${roomId}. Room now has:`,
        io.sockets.adapter.rooms.get(roomId)?.size,
        "members"
      );

      // 7. Increment member count (fire-and-forget, non-blocking)
      incrementMember(roomId).catch((err) => {
        console.warn(
          "[room:join] DB member increment failed (non-fatal):",
          (err as Error).message
        );
      });
    } catch (err) {
      console.error("[room:join] Unexpected error:", err);
      socket.emit("room:error", { code: "JOIN_FAILED" });
    }
  });

  // ── room:leave ───────────────────────────────────────
  socket.on("room:leave", async ({ roomId }: { roomId: string }) => {
    // 1. Leave the Socket.io room
    socket.leave(roomId);

    // 2. Notify others
    socket.to(roomId).emit("room:user_left", {
      username: socket.user.username,
    });

    // 3. Remove from tracking
    socket.currentRooms.delete(roomId);

    // 4. Decrement member count (best-effort)
    decrementMember(roomId).catch((err) => {
      console.warn(
        "[room:leave] DB member decrement failed (non-fatal):",
        (err as Error).message
      );
    });
  });

  // ── room:message ─────────────────────────────────────
  socket.on(
    "room:message",
    async ({ roomId, text }: { roomId: string; text: string }) => {
      // 1. Check socket is actually in this room
      if (!socket.currentRooms.has(roomId)) {
        socket.emit("room:error", { code: "NOT_IN_ROOM" });
        return;
      }

      // 2. Validate text
      if (
        !text ||
        typeof text !== "string" ||
        text.trim().length === 0 ||
        text.length > 500
      ) {
        socket.emit("room:error", { code: "INVALID_MESSAGE" });
        return;
      }

      const trimmed = text.trim();

      // 3. Check if socket is temporarily muted
      if (socket.mutedUntil && Date.now() < socket.mutedUntil) {
        const remainingSec = Math.ceil((socket.mutedUntil - Date.now()) / 1000);
        socket.emit("room:message_blocked", {
          reason: "MUTED",
          remainingSec,
        });
        return;
      }

      // 4. Content moderation (public room messages only — NEVER on DM messages)
      try {
        const modResult = await checkContent(trimmed);
        if (modResult.flagged) {
          socket.emit("room:message_blocked", { reason: "CONTENT_POLICY" });

          // Track violations and mute on second offense
          socket.contentViolations = (socket.contentViolations || 0) + 1;
          if (socket.contentViolations >= 2) {
            socket.mutedUntil = Date.now() + 60_000; // 60 second mute
          }
          return;
        }
      } catch {
        // If moderation fails, allow the message through (fail-open)
      }

      // 5. Broadcast to room (excluding sender — sender adds it locally)
      socket.to(roomId).emit("room:message", {
        username: socket.user.username,
        text: trimmed,
        at: Date.now(),
      });

      // NOTE: Messages are NOT persisted to DB (privacy-first)
    }
  );

  // ── disconnect ───────────────────────────────────────
  socket.on("disconnect", async () => {
    for (const roomId of socket.currentRooms) {
      // Notify room members (always)
      socket.to(roomId).emit("room:user_left", {
        username: socket.user.username,
      });

      // Decrement member count (best-effort)
      decrementMember(roomId).catch((err) => {
        console.warn(
          `[disconnect] DB decrement failed for ${roomId} (non-fatal):`,
          (err as Error).message
        );
      });
    }
  });
}
