import Notification from "../../models/Notification";
import User from "../../models/User";
import admin from "../../utils/firebase";

/* ================= SEND ================= */

export const sendNotification = async ({
  userId,
  title,
  body,
  type,
  data = {}
}: any) => {
  try {
    const user: any = await User.findById(userId).lean();
    if (!user) return;

    // ✅ Save notification in DB (never block push)
    await Notification.create({
      userId,
      title,
      body,
      type,
      data
    });

    // ✅ No tokens → exit early
    if (!user.fcmTokens || user.fcmTokens.length === 0) return;

    // ✅ Convert data to string (FCM requirement)
    const stringData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );

    // ✅ Send notifications (safe async loop)
    for (const token of user.fcmTokens) {
      admin
        .messaging()
        .send({
          token,
          notification: { title, body },
          data: stringData
        })
        .catch(err => {
          console.error("FCM error:", err.message);

          // 🔥 REMOVE INVALID TOKENS (important for prod)
          if (
            err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token"
          ) {
            User.updateOne(
              { _id: userId },
              { $pull: { fcmTokens: token } }
            ).catch(() => {});
          }
        });
    }

  } catch (err) {
    console.error("Notification failed", err);
  }
};