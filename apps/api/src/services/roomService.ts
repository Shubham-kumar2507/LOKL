import { Room } from "../models/Room";

export async function getNearbyRooms(lng: number, lat: number) {
  return Room.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: 3000,
      },
    },
    memberCount: { $lt: 50 },
  })
    .limit(20)
    .lean();
}

export async function createRoom(
  alias: string,
  lng: number,
  lat: number,
  creatorUUID: string
) {
  const room = new Room({
    alias,
    location: {
      type: "Point",
      coordinates: [lng, lat], // longitude FIRST, then latitude
    },
    createdBy: creatorUUID,
  });
  return room.save();
}

export async function incrementMember(roomId: string): Promise<void> {
  await Room.findByIdAndUpdate(roomId, { $inc: { memberCount: 1 } });
}

export async function decrementMember(roomId: string): Promise<void> {
  await Room.findByIdAndUpdate(roomId, {
    $inc: { memberCount: -1 },
  });
  // Ensure memberCount never goes below 0
  await Room.findByIdAndUpdate(roomId, {
    $max: { memberCount: 0 },
  });
}

export async function getRoomById(roomId: string) {
  return Room.findById(roomId).lean();
}
