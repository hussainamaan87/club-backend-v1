import Notification from "../../models/Notification";
import User from "../../models/User";
import admin from "../../utils/firebase";

interface SendNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}

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

    /* ===== SAVE IN-APP ===== */
    await Notification.create({
      userId,
      title,
      body,
      type,
      data
    });

    /* ===== NO TOKENS ===== */
    if (!user.fcmTokens || user.fcmTokens.length === 0) return;

    /* ===== LIMIT TOKENS (IMPORTANT) ===== */
    const tokens: string[] = user.fcmTokens.slice(0, 5);

    /* ===== CONVERT DATA ===== */
    const stringData: Record<string, string> = {};
    for (const key in data) {
      stringData[key] = String(data[key]);
    }

    /* ===== MULTICAST SEND ===== */
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body
      },
      data: stringData,
      android: {
        priority: "high"
      }
    });

    /* ===== CLEAN INVALID TOKENS ===== */
    const tokensToRemove: string[] = [];

    response.responses.forEach((res, index) => {
      if (!res.success) {
        const code = (res.error as any)?.code;

        const invalidErrors = [
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token",
          "messaging/unknown-error"
        ];

        if (invalidErrors.includes(code)) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      console.log("🧹 Removing invalid tokens:", tokensToRemove);

      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { $in: tokensToRemove } } }
      );
    }

  } catch (err) {
    console.error("Notification failed:", err);
  }
};