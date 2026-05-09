import express from "express";
import { auth, allow } from "../../middleware/auth.middleware";
import * as controller from "./event.controller";
import { uploadEvent } from "../../middleware/upload.middleware";

const router = express.Router();

/* ================= PUBLIC ================= */
router.get("/", auth, controller.getEvents);

/* ================= ADMIN ================= */
router.post("/", auth, allow(["ADMIN"]), controller.createEvent);

router.get("/:id", auth, controller.getEventById);
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
router.patch(
  "/:id/images",
  auth,
  allow(["HOST", "ADMIN"]),
  uploadEvent.array("images", 5),
  controller.uploadEventImages
);

router.delete(
  "/:id/images/:imageId",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.deleteEventImage
);

router.get(
  "/my",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.getMyEvents
);

export default router;