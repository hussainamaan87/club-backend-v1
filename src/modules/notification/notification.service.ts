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

    /* ===== CONVERT DATA TO STRING ===== */
    const stringData: Record<string, string> = {};
    for (const key in data) {
      stringData[key] = String(data[key]);
    }

    /* ===== SEND NOTIFICATIONS ===== */
    const promises = user.fcmTokens.map(async (token: string) => {
      try {
        await admin.messaging().send({
          token,
          notification: {
            title,
            body
          },
          data: stringData,
          android: {
            priority: "high"
          }
        });
      } catch (err: any) {
        console.error("FCM error:", err.message);

        /* ===== HANDLE INVALID TOKENS ===== */
        const invalidErrors = [
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token",
          "messaging/unknown-error"
        ];

        if (
          invalidErrors.includes(err.code) ||
          err.message?.includes("Requested entity was not found")
        ) {
          console.log("🧹 Removing invalid FCM token:", token);

          await User.updateOne(
            { _id: userId },
            { $pull: { fcmTokens: token } }
          );
        }
      }
    });

    await Promise.allSettled(promises);

  } catch (err) {
    console.error("Notification failed:", err);
  }
};