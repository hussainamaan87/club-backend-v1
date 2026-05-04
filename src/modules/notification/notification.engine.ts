import { sendNotification } from "./notification.service";
import { NotificationType } from "./notification.types";

/* ================= REGISTRATION ================= */

export const notifyRegistrationApproved = async (reg: any) => {
  await sendNotification({
    userId: reg.userId,
    title: "✅ Registration Approved",
    body: "You're confirmed for the event 🎉",
    type: NotificationType.REGISTRATION_APPROVED,
    data: {
      eventId: reg.eventId,
      screen: "event_detail"
    }
  });
};

export const notifyRegistrationRejected = async (reg: any) => {
  await sendNotification({
    userId: reg.userId,
    title: "❌ Registration Rejected",
    body: "Sorry, your request was not approved",
    type: NotificationType.REGISTRATION_REJECTED,
    data: {
      eventId: reg.eventId
    }
  });
};

export const notifyCheckin = async (reg: any) => {
  await sendNotification({
    userId: reg.userId,
    title: "🎟 Checked In",
    body: "Welcome! Enjoy the event 🚀",
    type: NotificationType.CHECKIN_SUCCESS,
    data: {
      eventId: reg.eventId
    }
  });
};

/* ================= EVENT ================= */

export const notifyHostAssigned = async (userId: string, eventId: string) => {
  await sendNotification({
    userId,
    title: "🎤 You're a host!",
    body: "You have been assigned to an event",
    type: NotificationType.HOST_ASSIGNED,
    data: { eventId }
  });
};

export const notifyEventUpdated = async (userId: string, eventId: string) => {
  await sendNotification({
    userId,
    title: "⏰ Event Updated",
    body: "Event timing/details changed",
    type: NotificationType.EVENT_UPDATED,
    data: { eventId }
  });
};

export const notifyEventReminder = async (userId: string, eventId: string) => {
  await sendNotification({
    userId,
    title: "⏳ Event Reminder",
    body: "Your event starts soon!",
    type: NotificationType.EVENT_REMINDER,
    data: { eventId }
  });
};