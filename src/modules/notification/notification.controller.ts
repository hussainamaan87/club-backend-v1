import Notification from "../../models/Notification";
import { success, error } from "../../utils/response";

/* ================= GET ================= */

export const getMyNotifications = async (req: any, res: any) => {
  try {
    const data = await Notification.find({
      userId: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return success(res, "Notifications fetched", data);

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

/* ================= MARK READ ================= */

export const markRead = async (req: any, res: any) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    return success(res, "Marked as read");

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};