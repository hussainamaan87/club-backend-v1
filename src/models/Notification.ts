import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true
    },

    body: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["EVENT", "REGISTRATION", "SYSTEM"],
      index: true
    },

    data: {
      type: Object
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

schema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Notification", schema);