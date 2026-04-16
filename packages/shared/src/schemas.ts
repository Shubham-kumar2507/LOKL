import { z } from "zod";

export const RoomSchema = z.object({
  alias: z.string(),
  lat: z.number(),
  lng: z.number(),
  memberCount: z.number(),
});

export const MessageSchema = z.object({
  roomId: z.string(),
  text: z.string().max(500),
});

export const SessionSchema = z.object({
  uuid: z.string(),
  alias: z.string(),
  token: z.string(),
});

export const DMRequestSchema = z.object({
  targetAlias: z.string(),
  roomId: z.string(),
});

export const CoordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type Room = z.infer<typeof RoomSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type DMRequest = z.infer<typeof DMRequestSchema>;
export type Coord = z.infer<typeof CoordSchema>;
