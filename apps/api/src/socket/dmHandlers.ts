import { Server } from "socket.io";
import crypto from "crypto";
import mongoose from "mongoose";
import { AuthenticatedSocket } from "./roomHandlers";

// ── Pending DM requests: requestId → fromSocketId ────────
const pendingRequests = new Map<string, string>();

// ── Register DM event handlers ───────────────────────────
export function registerDMHandlers(
  io: Server,
  socket: AuthenticatedSocket
) {
  // ── dm:request — initiate a DM with someone in the same room ──
  socket.on(
    "dm:request",
    ({ targetUsername, roomId }: { targetUsername: string; roomId: string }) => {
      // Validate targetUsername
      if (
        !targetUsername ||
        typeof targetUsername !== "string" ||
        targetUsername.trim().length === 0 ||
        targetUsername.length > 50
      ) {
        socket.emit("dm:error", { code: "INVALID_USERNAME" });
        return;
      }

      // Validate roomId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        socket.emit("dm:error", { code: "INVALID_ROOM_ID" });
        return;
      }

      // 1. Find the target socket in the room
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      if (!roomSockets) {
        socket.emit("dm:error", { code: "USER_NOT_FOUND" });
        return;
      }

      let targetSocket: AuthenticatedSocket | null = null;
      for (const sid of roomSockets) {
        const s = io.sockets.sockets.get(sid) as
          | AuthenticatedSocket
          | undefined;
        if (s && s.user.username === targetUsername && s.id !== socket.id) {
          targetSocket = s;
          break;
        }
      }

      if (!targetSocket) {
        socket.emit("dm:error", { code: "USER_NOT_FOUND" });
        return;
      }

      // 2. Generate request ID and store mapping
      const requestId = crypto.randomUUID();
      pendingRequests.set(requestId, socket.id);

      // 3. Notify the target
      targetSocket.emit("dm:incoming", {
        fromUsername: socket.user.username,
        requestId,
      });

      // 4. Expire after 60s
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          socket.emit("dm:expired", { requestId });
        }
      }, 60_000);
    }
  );

  // ── dm:accept — accept an incoming DM request ─────────────
  socket.on("dm:accept", ({ requestId }: { requestId: string }) => {
    // Validate requestId format
    if (!requestId || typeof requestId !== "string") return;

    const fromSocketId = pendingRequests.get(requestId);
    if (!fromSocketId) return; // expired or invalid

    // Create a temporary DM room
    const tempRoomId = "dm_" + crypto.randomUUID();

    // Join both parties
    socket.join(tempRoomId);
    io.sockets.sockets.get(fromSocketId)?.join(tempRoomId);

    // Notify both that the DM channel is ready
    io.to(tempRoomId).emit("dm:ready", { tempRoomId });

    // Clean up
    pendingRequests.delete(requestId);
  });

  // ── dm:reject — decline an incoming DM request ────────────
  socket.on("dm:reject", ({ requestId }: { requestId: string }) => {
    if (!requestId || typeof requestId !== "string") return;

    const fromSocketId = pendingRequests.get(requestId);
    if (fromSocketId) {
      io.sockets.sockets
        .get(fromSocketId)
        ?.emit("dm:declined", { requestId });
    }
    pendingRequests.delete(requestId);
  });

  // ── dm:pubkey — relay public key to the other party ───────
  // The server does NOT store the public key
  socket.on(
    "dm:pubkey",
    ({ tempRoomId, pubKey }: { tempRoomId: string; pubKey: string }) => {
      // Validate inputs
      if (
        !tempRoomId ||
        typeof tempRoomId !== "string" ||
        !tempRoomId.startsWith("dm_")
      ) return;
      if (!pubKey || typeof pubKey !== "string" || pubKey.length > 100) return;

      socket
        .to(tempRoomId)
        .emit("dm:pubkey", { pubKey, username: socket.user.username });
    }
  );

  // ── dm:message — route ciphertext only ────────────────────
  // NO decryption. NO storage. NO logging.
  // NEVER pass DM messages through content moderation — they are ciphertext.
  socket.on(
    "dm:message",
    ({
      tempRoomId,
      nonce,
      ct,
    }: {
      tempRoomId: string;
      nonce: string;
      ct: string;
    }) => {
      // Validate inputs
      if (
        !tempRoomId ||
        typeof tempRoomId !== "string" ||
        !tempRoomId.startsWith("dm_")
      ) return;
      if (!nonce || typeof nonce !== "string" || nonce.length > 100) return;
      if (!ct || typeof ct !== "string" || ct.length > 50_000) return;

      socket.to(tempRoomId).emit("dm:message", {
        nonce,
        ct,
        at: Date.now(),
      });
    }
  );
}
