import express from "express";
import { auth, allow } from "../../middleware/auth.middleware";
import * as controller from "./registration.controller";

const router = express.Router();

/* ================= USER ================= */

router.post("/", auth, controller.register);
router.get("/my", auth, controller.myRegistrations);
router.get("/:id/qr", auth, controller.getQR);

/* ================= HOST ================= */

router.get(
  "/event/:eventId",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.eventRegistrations
);

router.post(
  "/:id/approve",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.approve
);

router.post(
  "/:id/reject",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.reject
);

router.post(
  "/:id/approve-and-checkin",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.approveAndCheckin
);
router.post(
  "/preview",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.previewQR
);

router.post(
  "/checkin",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.checkin
);

router.get(
  "/event/:eventId/attendance-stats",
  auth,
  allow(["HOST", "ADMIN"]),
  controller.getAttendanceStats
);
export default router;