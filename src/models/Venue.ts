import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    googleMapsUrl: String,
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true
    }
  },
  { timestamps: true }
);
schema.index(
  {
    name: 1,
    cityId: 1
  },
  {
    unique: true
  }
);
export default mongoose.model("Venue", schema);