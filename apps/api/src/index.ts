import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import helmet from "helmet";
import cors from "cors";
import jwt, { JwtPayload } from "jsonwebtoken";

import authRouter from "./routes/auth";
import roomsRouter from "./routes/rooms";
import {
  registerRoomHandlers,
  AuthenticatedSocket,
} from "./socket/roomHandlers";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// ── Socket.io Auth Middleware ──────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("MISSING_TOKEN"));
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret"
    ) as JwtPayload;
    (socket as any).user = decoded;
    next();
  } catch {
    next(new Error("INVALID_TOKEN"));
  }
});

// ── Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  })
);
app.use(express.json());

// ── Routes ─────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);

// ── Boot ───────────────────────────────────────────────
async function boot() {
  // MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB connected");
    } catch (err) {
      console.error("⚠️  MongoDB connection failed:", err);
    }
  } else {
    console.warn("⚠️  MONGO_URI not set — skipping DB connection");
  }

  // Redis + Socket.io adapter
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Redis adapter attached");
    } catch (err) {
      console.error("⚠️  Redis connection failed:", err);
    }
  } else {
    console.warn("⚠️  REDIS_URL not set — using in-memory adapter");
  }

  // Start server
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`🚀 LOKL API ready on port ${PORT}`);
  });
}

// ── Socket.io Connection Handler ──────────────────────
io.on("connection", (socket) => {
  const s = socket as unknown as AuthenticatedSocket;
  console.log(`⚡ Socket connected: ${s.id} (${s.user.alias})`);
  s.currentRooms = new Set();
  registerRoomHandlers(io, s);
});

boot();

export { app, io };
