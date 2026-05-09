import express from "express";
import * as controller from "./club.controller";

const router = express.Router();

router.get("/", controller.getClubs);

router.get("/:id", controller.getClubById);

router.get("/:id/events", controller.getClubEvents);

export default router;