import { Router, Request, Response, IRouter } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { CoordSchema, RoomSchema } from "@lokl/shared";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getNearbyRooms,
  createRoom,
  getRoomById,
} from "../services/roomService";

const router: IRouter = Router();

// ── Rate Limiters ──────────────────────────────────────
const nearbyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS" },
});

const createRoomLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS" },
});

// ── GET /api/rooms/nearby?lat=XX&lng=XX ────────────────
router.get("/nearby", nearbyLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = CoordSchema.safeParse({
      lat: Number(req.query.lat),
      lng: Number(req.query.lng),
    });

    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_COORDINATES" });
      return;
    }

    const { lat, lng } = parsed.data;
    const rooms = await getNearbyRooms(lng, lat);
    res.json({ rooms });
  } catch (err) {
    console.error("Error fetching nearby rooms:", (err as Error).message);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── POST /api/rooms ────────────────────────────────────
router.post(
  "/",
  createRoomLimiter,
  authMiddleware,
  validate(RoomSchema.omit({ memberCount: true })),
  async (req: AuthRequest, res: Response) => {
    try {
      const { alias, lat, lng } = req.body;
      const room = await createRoom(alias, lng, lat, req.user!.userId);
      res.status(201).json({ room });
    } catch (err) {
      console.error("Error creating room:", (err as Error).message);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

// ── GET /api/rooms/:roomId ─────────────────────────────
router.get("/:roomId", async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;

    // Validate roomId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ error: "INVALID_ROOM_ID" });
      return;
    }

    const room = await getRoomById(roomId);
    if (!room) {
      res.status(404).json({ error: "ROOM_NOT_FOUND" });
      return;
    }
    res.json({ room });
  } catch (err) {
    console.error("Error fetching room:", (err as Error).message);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;
