import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import {
  incrementMember,
  decrementMember,
} from "../services/roomService";

// ── Extended socket type ─────────────────────────────
export interface AuthenticatedSocket extends Socket {
  user: { uuid: string; alias: string; role: string };
  currentRooms: Set<string>;
}

// ── Register room event handlers ─────────────────────
export function registerRoomHandlers(
  io: Server,
  socket: AuthenticatedSocket
) {
  // ── room:join ────────────────────────────────────────
  socket.on("room:join", async ({ roomId }: { roomId: string }) => {
    // 1. Validate roomId is a valid MongoDB ObjectId string
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      socket.emit("error", { code: "INVALID_ROOM_ID" });
      return;
    }

    // 2. Join the Socket.io room (always succeeds, no DB needed)
    socket.join(roomId);

    // 3. Notify others in the room
    socket.to(roomId).emit("room:user_joined", {
      alias: socket.user.alias,
    });

    // 4. Confirm back to sender
    socket.emit("room:joined", { roomId });

    // 5. Track for cleanup on disconnect
    socket.currentRooms.add(roomId);

    console.log(
      `[room:join] ${socket.user.alias} joined ${roomId}`
    );

    // 6. Increment member count (best-effort, non-blocking)
    try {
      await incrementMember(roomId);
    } catch (err) {
      console.warn("[room:join] DB member increment failed (non-fatal):", (err as Error).message);
    }
  });

  // ── room:leave ───────────────────────────────────────
  socket.on("room:leave", async ({ roomId }: { roomId: string }) => {
    // 1. Leave the Socket.io room
    socket.leave(roomId);

    // 2. Notify others
    socket.to(roomId).emit("room:user_left", {
      alias: socket.user.alias,
    });

    // 3. Remove from tracking
    socket.currentRooms.delete(roomId);

    console.log(
      `[room:leave] ${socket.user.alias} left ${roomId}`
    );

    // 4. Decrement member count (best-effort)
    try {
      await decrementMember(roomId);
    } catch (err) {
      console.warn("[room:leave] DB member decrement failed (non-fatal):", (err as Error).message);
    }
  });

  // ── room:message ─────────────────────────────────────
  socket.on(
    "room:message",
    ({ roomId, text }: { roomId: string; text: string }) => {
      // 1. Validate text
      if (
        !text ||
        typeof text !== "string" ||
        text.trim().length === 0 ||
        text.length > 500
      ) {
        socket.emit("error", { code: "INVALID_MESSAGE" });
        return;
      }

      const trimmed = text.trim();

      // 2. Broadcast to room (excluding sender — sender adds it locally)
      socket.to(roomId).emit("room:message", {
        alias: socket.user.alias,
        text: trimmed,
        at: Date.now(),
      });

      // NOTE: Messages are NOT persisted to DB (privacy-first)
    }
  );

  // ── disconnect ───────────────────────────────────────
  socket.on("disconnect", async () => {
    console.log(
      `[disconnect] ${socket.user.alias} (${socket.id}) — cleaning up ${socket.currentRooms.size} room(s)`
    );

    for (const roomId of socket.currentRooms) {
      // Notify room members (always)
      socket.to(roomId).emit("room:user_left", {
        alias: socket.user.alias,
      });

      // Decrement member count (best-effort)
      try {
        await decrementMember(roomId);
      } catch (err) {
        console.warn(
          `[disconnect] DB decrement failed for ${roomId} (non-fatal):`,
          (err as Error).message
        );
      }
    }
  });
}
