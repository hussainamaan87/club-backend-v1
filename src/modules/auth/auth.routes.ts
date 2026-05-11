import express from 'express';

import { auth } from '../../middleware/auth.middleware';

import { uploadUser } from '../../middleware/upload.middleware';

import * as controller from './auth.controller';

const router = express.Router();

/* ================= OTP ================= */

router.post('/send-otp', controller.sendOtp);

router.post('/verify-otp', controller.verifyOtp);

/* ================= USER ================= */

router.get('/me', auth, controller.getMe);

router.patch('/profile', auth, controller.updateProfile);

router.patch('/profile/image', auth, uploadUser.single('image'), controller.updateProfileImage);

router.post('/fcm-token', auth, controller.saveFcmToken);

export default router;
