import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, trim: true },

    phone: {
      type: String,
      unique: true,
      required: true,
      index: true
    },

    email: {
      type: String,
      unique: true,
      sparse: true
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

fcmTokens: {

  type: [String],

  default: [],

  index: true

},
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"]
    },

    bio: String
  },
  { timestamps: true }
);

export default mongoose.model("User", schema);