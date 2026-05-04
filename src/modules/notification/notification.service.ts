import Notification from "../../models/Notification";
import User from "../../models/User";
import admin from "../../utils/firebase";

/* ================= TYPES ================= */

interface SendNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}

/* ================= SEND ================= */

export const sendNotification = async ({
  userId,
  title,
  body,
  type,
  data = {}
}: SendNotificationParams) => {
  try {
    /* ===== GET USER ===== */
    const user: any = await User.findById(userId).lean();
    if (!user) return;

    /* ===== SAVE TO DB (IN-APP) ===== */
    await Notification.create({
      userId,
      title,
      body,
      type,
      data
    });

    /* ===== NO TOKENS → EXIT ===== */
    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      return;
    }

    /* ===== FCM DATA MUST BE STRING ===== */
    const stringData: Record<string, string> = {};

    for (const key in data) {
      stringData[key] = String(data[key]);
    }

    /* ===== SEND TO ALL DEVICES ===== */
    const promises = user.fcmTokens.map((token: string) =>
      admin
        .messaging()
        .send({
          token,
          notification: {
            title,
            body
          },
          data: stringData,
          android: {
            priority: "high"
          }
        })
        .catch(async (err: any) => {
          console.error("FCM error:", err.message);

          /* ===== REMOVE INVALID TOKENS ===== */
          if (
            err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token"
          ) {
            await User.updateOne(
              { _id: userId },
              { $pull: { fcmTokens: token } }
            );
          }
        })
    );

    await Promise.allSettled(promises);

  } catch (err) {
    console.error("Notification failed:", err);
  }
};