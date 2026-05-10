import express from "express";
import {
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile,
  saveFcmToken
} from "./auth.controller";
import { auth } from "../../middleware/auth.middleware";

import { uploadUser } from "../../middleware/upload.middleware";
import { searchUsersPublic, updateProfileImage } from "./auth.service";
import { error, success } from "../../utils/response";
import User from "../../models/User";


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

router.get(
  "/users",
  auth,
  searchUsersPublic
);
router.post("/fcm-token", auth, saveFcmToken);

export default router;