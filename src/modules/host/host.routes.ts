import express from "express";
import { auth, allow } from "../../middleware/auth.middleware";
import * as controller from "./host.controller";

const router = express.Router();

router.use(auth, allow(["HOST", "ADMIN"]));

router.get("/users", controller.searchUser);

export default router;