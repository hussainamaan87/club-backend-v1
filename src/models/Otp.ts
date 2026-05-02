import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// 🔥 TTL index
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 🔥 fast verification
schema.index({ phone: 1, otp: 1 });

export default mongoose.model("Otp", schema);