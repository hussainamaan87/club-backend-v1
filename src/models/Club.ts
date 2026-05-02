import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: String,

    image: String,
    imagePublicId: String,

    banner: String,
    bannerPublicId: String,
    

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true
    }
  },
  { timestamps: true }
);

// 🔥 search optimization
schema.index({ name: "text" });

export default mongoose.model("Club", schema);