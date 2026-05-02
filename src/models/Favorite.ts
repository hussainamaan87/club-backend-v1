import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// 🔥 prevent duplicates
schema.index({ userId: 1, eventId: 1 }, { unique: true });

export default mongoose.model("Favorite", schema);