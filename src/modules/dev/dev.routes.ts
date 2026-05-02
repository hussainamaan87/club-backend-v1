import express from "express";
import { auth } from "../../middleware/auth.middleware";
import { sendNotification } from "../notification/notification.service";

const router = express.Router();

/**
 * 🔥 SEND TEST NOTIFICATION TO CURRENT USER
 */
router.post("/test", auth, async (req: any, res: any) => {
  try {
    await sendNotification({
      userId: req.user.id,
      title: "🔥 Test Notification",
      body: "If you see this, everything works 🚀",
      type: "SYSTEM",
      data: {
        screen: "home"
      }
    });

    return res.json({
      success: true,
      message: "Notification sent"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed"
    });
  }
});

/**
 * 🔥 SEND TO ANY USER (manual userId)
 */
router.post("/test/:userId", async (req: any, res: any) => {
  try {
    await sendNotification({
      userId: req.params.userId,
      title: "🔥 Manual Test",
      body: "Direct send to user 🚀",
      type: "SYSTEM"
    });

    return res.json({
      success: true,
      message: "Notification sent"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false
    });
  }
});

export default router;