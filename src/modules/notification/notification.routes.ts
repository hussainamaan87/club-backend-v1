import express from "express";
import { auth } from "../../middleware/auth.middleware";
import * as controller from "./notification.controller";

const router = express.Router();

router.get("/", auth, controller.getMyNotifications);
router.patch("/read", auth, controller.markRead);

export default router;