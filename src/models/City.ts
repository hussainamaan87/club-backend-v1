import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    state: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    pinCode: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

/* ================= UNIQUE ================= */

schema.index(
  {
    name: 1,
    state: 1
  },
  {
    unique: true
  }
);

export default mongoose.model(
  "City",
  schema
);