import dotenv from "dotenv";
dotenv.config();

import express, { Express } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { createClient, RedisClientType } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import helmet from "helmet";
import cors from "cors";
import jwt, { JwtPayload } from "jsonwebtoken";

import authRouter from "./routes/auth";
import roomsRouter from "./routes/rooms";
import mediaRouter from "./routes/media";
import {
  registerRoomHandlers,
  AuthenticatedSocket,
} from "./socket/roomHandlers";
import { registerDMHandlers } from "./socket/dmHandlers";
import { decrementMember } from "./services/roomService";

// ── JWT Secret: REQUIRED in production ───────────────────
const JWT_SECRET = process.env.JWT_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!JWT_SECRET) {
  if (IS_PRODUCTION) {
    console.error("🚨 FATAL: JWT_SECRET environment variable is not set. Refusing to start in production.");
    process.exit(1);
  } else {
    console.warn("⚠️  JWT_SECRET not set — using 'dev-secret' (NEVER do this in production)");
  }
}

const jwtSecret = JWT_SECRET || "dev-secret";

const app: Express = express();
const httpServer = createServer(app);

// ── Redis client reference (shared for session storage) ──
let redisClient: RedisClientType | null = null;

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// ══════════════════════════════════════════════════════════
// STEP 2: Strip IP addresses from ALL requests
// This runs BEFORE any middleware, logger, or handler.
// No IP address will ever reach any downstream code.
// ══════════════════════════════════════════════════════════
app.use((req, _res, next) => {
  delete req.headers["x-forwarded-for"];
  delete req.headers["x-real-ip"];
  delete req.headers["x-client-ip"];
  delete req.headers["cf-connecting-ip"];
  delete req.headers["true-client-ip"];
  next();
});

// ══════════════════════════════════════════════════════════
// STEP 7: Hardened Security Headers (Helmet + CSP)
// ══════════════════════════════════════════════════════════
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
        ],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: "no-referrer" },
  })
);

app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  })
);
app.use(express.json({ limit: "1mb" }));

// ── Routes ─────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/media", mediaRouter);

// ── Socket.io Auth Middleware ──────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("MISSING_TOKEN"));
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    (socket as any).user = decoded;
    next();
  } catch {
    next(new Error("INVALID_TOKEN"));
  }
});

// ── Socket.io Connection Handler ──────────────────────
io.on("connection", async (socket) => {
  const s = socket as unknown as AuthenticatedSocket;
  s.currentRooms = new Set();
  s.contentViolations = 0;

  // ══════════════════════════════════════════════════════
  // STEP 5: Store socket session in Redis (TTL 24h)
  // ══════════════════════════════════════════════════════
  if (redisClient) {
    try {
      await redisClient.set(`socket:${s.id}`, s.user.userId, { EX: 86400 });
    } catch {
      // Non-fatal: session tracking is best-effort
    }
  }

  registerRoomHandlers(io, s);
  registerDMHandlers(io, s);

  // Clean up Redis session on disconnect
  s.on("disconnect", async () => {
    if (redisClient) {
      try {
        await redisClient.del(`socket:${s.id}`);
      } catch {
        // Non-fatal
      }
    }
  });
});

// ── Boot ───────────────────────────────────────────────
async function boot() {
  // MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });
      console.log("✅ MongoDB connected");
    } catch (err) {
      console.error("⚠️  MongoDB connection failed:", (err as Error).message);
    }
  } else {
    console.warn("⚠️  MONGO_URI not set — skipping DB connection");
  }

  // ══════════════════════════════════════════════════════
  // STEP 5: Redis connection + security check
  // ══════════════════════════════════════════════════════
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    // Warn if Redis URL has no password in production
    if (IS_PRODUCTION) {
      try {
        const parsed = new URL(redisUrl);
        if (!parsed.password) {
          console.error(
            "🚨 WARNING: REDIS_URL has no password set! " +
            "This is a security risk in production. " +
            "Use redis://:password@host:port format."
          );
        }
      } catch {
        console.error("🚨 WARNING: Could not parse REDIS_URL to check auth.");
      }
    }

    try {
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      redisClient = pubClient as unknown as RedisClientType;
      console.log("✅ Redis adapter attached");
    } catch (err) {
      console.error("⚠️  Redis connection failed:", (err as Error).message);
    }
  } else {
    if (IS_PRODUCTION) {
      console.error("🚨 WARNING: REDIS_URL not set in production — session tracking disabled");
    } else {
      console.warn("⚠️  REDIS_URL not set — using in-memory adapter");
    }
  }

  // Start server
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`🚀 LOKL API ready on port ${PORT}`);
  });
}

// ══════════════════════════════════════════════════════════
// STEP 6: Graceful shutdown — decrement ALL member counts
// Even on crashes/SIGTERM, we clean up room member counts.
// ══════════════════════════════════════════════════════════
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 ${signal} received — gracefully shutting down...`);

  // Decrement member counts for all active sockets
  for (const [, socket] of io.sockets.sockets) {
    const s = socket as unknown as AuthenticatedSocket;
    const rooms = s.currentRooms || new Set();
    for (const roomId of rooms) {
      try {
        await decrementMember(roomId);
      } catch {
        // Best-effort during shutdown
      }
    }

    // Clean up Redis session
    if (redisClient) {
      try {
        await redisClient.del(`socket:${s.id}`);
      } catch {
        // Best-effort
      }
    }
  }

  // Close HTTP server
  httpServer.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown stalls
  setTimeout(() => {
    console.error("⚠️  Forced exit after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

boot();

export { app, io };
