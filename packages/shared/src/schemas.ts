import { z } from "zod";

// ── Room schema (strict — rejects unknown fields) ────────
export const RoomSchema = z.object({
  alias: z.string().min(1, "Alias is required").max(40, "Alias too long").trim(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  memberCount: z.number().int().min(0),
}).strict();

export type Room = z.infer<typeof RoomSchema>;

// ── Message schema (strict) ──────────────────────────────
export const MessageSchema = z.object({
  roomId: z.string().min(1),
  text: z.string().min(1, "Message is required").max(500, "Message too long"),
}).strict();

export type Message = z.infer<typeof MessageSchema>;

// ── Session schema ───────────────────────────────────────
export const SessionSchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  token: z.string().min(1),
}).strict();

export type Session = z.infer<typeof SessionSchema>;

// ── Signup schema ────────────────────────────────────────
export const SignupSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
}).strict();

export type Signup = z.infer<typeof SignupSchema>;

// ── Login schema ─────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
}).strict();

export type Login = z.infer<typeof LoginSchema>;

// ── DM request schema (strict) ──────────────────────────
export const DMRequestSchema = z.object({
  targetUsername: z.string().min(1).max(50, "Username too long"),
  roomId: z.string().min(1),
}).strict();

export type DMRequest = z.infer<typeof DMRequestSchema>;

// ── Coordinate schema ───────────────────────────────────
export const CoordSchema = z.object({
  lat: z.number().min(-90, "Latitude must be ≥ -90").max(90, "Latitude must be ≤ 90"),
  lng: z.number().min(-180, "Longitude must be ≥ -180").max(180, "Longitude must be ≤ 180"),
}).strict();

export type Coord = z.infer<typeof CoordSchema>;
