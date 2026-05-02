import express from "express";
import {
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile
} from "./auth.controller";
import { auth } from "../../middleware/auth.middleware";

import { uploadUser } from "../../middleware/upload.middleware";
import { updateProfileImage } from "./auth.service";


const router = express.Router();

/* ================= AUTH ================= */
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

/* ================= USER ================= */
router.get("/me", auth, getMe);
router.patch("/profile", auth, updateProfile);


router.patch(
  "/profile/image",
  auth,
  uploadUser.single("image"),
  updateProfileImage
);

export default router;