import express from "express";
import { auth, allow } from "../../middleware/auth.middleware";
import * as controller from "./event.controller";
import { uploadEvent } from "../../middleware/upload.middleware";

const router = express.Router();

/* ================= EVENTS ================= */

router.get(
  "/",
  auth,
  controller.getEvents
);

/* ================= MY EVENTS ================= */

router.get(
  "/my",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.getMyEvents
);

/* ================= CREATE EVENT ================= */

router.post(
  "/",
  auth,
  allow(["ADMIN"]),
  controller.createEvent
);

/* ================= EVENT DETAILS ================= */

router.get(
  "/:id",
  auth,
  controller.getEventById
);

router.patch(
  "/:id",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.updateEvent
);


/* ================= EVENT BANNER ================= */

router.patch(
  "/:id/banner",
  auth,
  allow(["ADMIN"]),
  uploadEvent.single("banner"),
  controller.updateEventBanner
);

/* ================= EVENT IMAGES ================= */

router.patch(
  "/:id/images",
  auth,
  allow(["HOST", "ADMIN"]),
  uploadEvent.array("images", 4),
  controller.uploadEventImages
);

/* ================= DELETE EVENT IMAGE ================= */

router.delete(
  "/:id/images/:imageId",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.deleteEventImage
);

export default router;