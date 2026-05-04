import mongoose from "mongoose";

export const NotificationTypes = [
  "REGISTRATION_APPROVED",
  "REGISTRATION_REJECTED",
  "CHECKIN_SUCCESS",
  "HOST_ASSIGNED",
  "EVENT_UPDATED",
  "EVENT_REMINDER",
  "NEW_EVENT",
  "FAVORITE_REMINDER",
  "SYSTEM"
] as const;

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
      enum: NotificationTypes,
      required: true,
      index: true
    },

    data: {
      type: Object,
      default: {}
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