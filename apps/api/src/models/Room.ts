import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
  alias: { type: String, required: true },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  memberCount: { type: Number, default: 0, min: 0 },
  createdBy: { type: String, required: true }, // UUID only, never a real name
  createdAt: { type: Date, default: Date.now },
});

RoomSchema.index({ location: "2dsphere" });
RoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // auto-delete after 1 hour

export const Room = mongoose.model("Room", RoomSchema);
