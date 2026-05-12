import express from "express";

import {
  optionalAuth
} from "../../middleware/auth.middleware";

import * as controller from "./club.controller";

const router = express.Router();

router.use(optionalAuth);

router.get("/", controller.getClubs);

router.get("/:id/events", controller.getClubEvents);

router.get("/:id", controller.getClubById);

export default router;