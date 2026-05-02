import express from "express";
import { auth, allow } from "../../middleware/auth.middleware";
import * as controller from "./event.controller";
import { uploadEvent } from "../../middleware/upload.middleware";

const router = express.Router();

/* ================= PUBLIC ================= */
router.get("/", controller.getEvents);

/* ================= ADMIN ================= */
router.post("/", auth, allow(["ADMIN"]), controller.createEvent);

/* ================= HOST ================= */
router.patch(
  "/:id/host-edit",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.hostEditEvent
);

/* ================= EVENT BANNER ================= */
router.patch(
  "/:id/banner",
  auth,
  allow(["ADMIN"]),
  uploadEvent.single("banner"),
  controller.updateEventBanner
);

router.get(
  "/my",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.getMyEvents
);

export default router;