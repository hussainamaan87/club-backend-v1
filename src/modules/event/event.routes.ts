import express from "express";

import {
  auth,
  allow
} from "../../middleware/auth.middleware";

import {
  uploadEvent
} from "../../middleware/upload.middleware";

import * as controller
  from "./event.controller";

const router = express.Router();

/* ================= PUBLIC ================= */

/**
 * GET /events
 */
router.get("/", controller.getEvents);

/**
 * GET /events/my
 */
router.get(
  "/my",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.getMyEvents
);
/**
 * GET /events/:id
 */
router.get("/:id", controller.getEventById);

/* ================= HOST/ADMIN ================= */



/**
 * POST /events
 */
router.post(
  "/",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.createEvent
);

/**
 * PATCH /events/:id
 */
router.patch(
  "/:id",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.updateEvent
);

/**
 * PATCH /events/:id/banner
 */
router.patch(
  "/:id/banner",
  auth,
  allow(["HOST", "ADMIN"]),
  uploadEvent.single("image"),
  controller.updateEventBanner
);

/**
 * PATCH /events/:id/images
 */
router.patch(
  "/:id/images",
  auth,
  allow(["HOST", "ADMIN"]),
  uploadEvent.array("images", 4),
  controller.uploadEventImages
);

/**
 * DELETE /events/:id/images/:imageId
 */
router.delete(
  "/:id/images/:imageId",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.deleteEventImage
);

export default router;