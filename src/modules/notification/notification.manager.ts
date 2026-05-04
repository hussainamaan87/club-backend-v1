import Favorite from "../../models/Favorite";
import User from "../../models/User";
import { sendNotification } from "./notification.service";

/* ================= SYSTEM ================= */

export const sendSystemNotification = async (
  title: string,
  body: string
) => {
  const users = await User.find().select("_id").lean();

  for (const u of users) {
    sendNotification({
      userId: u._id.toString(),
      title,
      body,
      type: "SYSTEM"
    }).catch(() => {});
  }
};

/* ================= NEW EVENT ================= */

export const notifyNewEvent = async (event: any) => {
  const users = await User.find().select("_id").lean();

  for (const u of users) {
    sendNotification({
      userId: u._id.toString(),
      title: "🎉 New Event",
      body: `${event.title} is live now`,
      type: "NEW_EVENT",
      data: { eventId: event._id }
    }).catch(() => {});
  }
};

/* ================= EVENT UPDATE ================= */

export const notifyEventUpdateToAll = async (event: any) => {
  const userIds = new Set<string>();

  // hosts
  for (const h of event.hosts || []) {
    userIds.add(h.toString());
  }

  // favorites
  const favorites = await Favorite.find({ eventId: event._id }).lean();
  for (const f of favorites) {
    userIds.add(f.userId.toString());
  }

  for (const userId of userIds) {
    sendNotification({
      userId,
      title: "📢 Event Updated",
      body: `"${event.title}" has new updates`,
      type: "EVENT_UPDATED",
      data: { eventId: event._id }
    }).catch(() => {});
  }
};

/* ================= FAVORITE REMINDER ================= */

export const notifyFavoriteUsers = async (event: any) => {
  const favorites = await Favorite.find({ eventId: event._id }).lean();

  for (const f of favorites) {
    sendNotification({
      userId: f.userId.toString(),
      title: "⭐ Event Reminder",
      body: `${event.title} starts soon`,
      type: "FAVORITE_REMINDER",
      data: { eventId: event._id }
    }).catch(() => {});
  }
};