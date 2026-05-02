import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Venue", schema);