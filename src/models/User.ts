import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    phone: {
      type: String,
      unique: true,
      required: true,
      index: true
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true
    },

    roles: {
      type: [String],
      enum: ["ADMIN", "HOST", "USER"],
      default: ["USER"],
      index: true
    },

    image: String,
    imagePublicId: String,

    dob: Date,

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"]
    },

    bio: String,

    instagramId: {
      type: String,
      index: true
    },

    fcmTokens: {
      type: [String],
      default: [],
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", schema);