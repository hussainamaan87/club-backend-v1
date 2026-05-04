import cron from "node-cron";
import Event from "../models/Event";
import Registration from "../models/Registration";
import { notifyEventReminder } from "../modules/notification/notification.engine";

export const startCron = () => {
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

    const events = await Event.find({
      startTime: { $gte: now, $lte: nextHour }
    });

    for (const event of events) {
      const regs = await Registration.find({
        eventId: event._id,
        status: "APPROVED"
      });

      for (const reg of regs) {
        await notifyEventReminder(reg.userId, event._id);
      }
    }
  });
};