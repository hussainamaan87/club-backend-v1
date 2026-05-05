import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../../models/User";
import Otp from "../../models/Otp";
import { success, error } from "../../utils/response";
import { sendTelegram } from "../../utils/telegram";
import { normalizePhone } from "./auth.utils";
import cloudinary from "../../utils/cloudinary";

/* ================= HELPERS ================= */

const hashOtp = (otp: string) =>
  crypto.createHash("sha256").update(otp).digest("hex");

/* ================= SEND OTP ================= */

export const sendOtp = async (req: any, res: any) => {
  try {
    const rawPhone = req.body.phone;

    if (!rawPhone) return error(res, "Phone required");

    const phone = normalizePhone(rawPhone);

    if (phone.length !== 12) {
      return error(res, "Invalid phone");
    }

    /* 🔥 RATE LIMIT (1 per 60 sec) */
    const recent = await Otp.findOne({
      phone,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (recent) {
      return error(res, "Wait before requesting another OTP");
    }

    /* 🔥 CLEAN OLD OTPs */
    await Otp.deleteMany({ phone });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashOtp(otp);

    await Otp.create({
      phone,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    console.log(`OTP for ${phone}: ${otp}`);

    /* 🔥 ASYNC SEND */
    sendTelegram(`OTP for ${phone}: ${otp}`).catch(() => {});

    return success(res, "OTP sent");

  } catch (err) {
    console.error(err);
    return error(res, "Failed to send OTP");
  }
};

/* ================= VERIFY OTP ================= */

export const verifyOtp = async (req: any, res: any) => {
  try {
    const rawPhone = req.body.phone;
    const { otp } = req.body;

    if (!rawPhone || !otp) {
      return error(res, "Missing fields");
    }

    const phone = normalizePhone(rawPhone);

    if (phone.length !== 12) {
      return error(res, "Invalid phone");
    }

    const hashedOtp = hashOtp(otp);

    const record: any = await Otp.findOne({
      phone,
      otp: hashedOtp
    }).sort({ createdAt: -1 });

    if (!record) {
      return error(res, "Invalid OTP");
    }

    if (record.expiresAt < new Date()) {
      return error(res, "OTP expired");
    }

    /* 🔥 DELETE ALL OTPs AFTER SUCCESS */
    await Otp.deleteMany({ phone });

    /* ================= USER ================= */

    let user: any = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
    }

    /* ===== ADMIN AUTO ASSIGN ===== */
    const ADMIN_PHONE = process.env.ADMIN_PHONE;

    if (ADMIN_PHONE && phone === ADMIN_PHONE) {
      if (!user.roles.includes("ADMIN")) {
        user.roles = [...new Set([...user.roles, "ADMIN"])];
        await user.save();
      }
    }

    /* ================= JWT ================= */

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing");
    }

    const token = jwt.sign(
      {
        id: user._id,
        roles: user.roles
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return success(res, "Login success", {
      token
    });

  } catch (err) {
    console.error(err);
    return error(res, "Verification failed");
  }
};

/* ================= GET ME ================= */

export const getMe = async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name phone roles dob gender bio image"
    );

    if (!user) return error(res, "User not found", 404);

    return success(res, "User fetched", {
      id: user._id,
      name: user.name,
      phone: user.phone,
      roles: user.roles,
      dob: user.dob,
      gender: user.gender,
      bio: user.bio,
      image: user.image,
      isAdmin: user.roles.includes("ADMIN"),
      isHost: user.roles.includes("HOST")
    });

  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch user");
  }
};

/* ================= UPDATE PROFILE ================= */

export const updateProfile = async (req: any, res: any) => {
  try {
    const { name, dob, gender, bio } = req.body;

    const user: any = await User.findById(req.user.id);
    if (!user) return error(res, "User not found");

    if (name) user.name = name.trim();

    if (dob) {
      const parsed = new Date(dob);
      if (isNaN(parsed.getTime())) {
        return error(res, "Invalid date of birth");
      }
      user.dob = parsed;
    }

    const allowed = ["MALE", "FEMALE", "OTHER"];

    if (gender) {
      if (!allowed.includes(gender)) {
        return error(res, "Invalid gender");
      }
      user.gender = gender;
    }

    if (bio) user.bio = bio;

    await user.save();

    return success(res, "Profile updated", {
      id: user._id,
      name: user.name,
      phone: user.phone,
      roles: user.roles,
      dob: user.dob,
      gender: user.gender,
      bio: user.bio
    });

  } catch (err) {
    console.error(err);
    return error(res, "Failed to update profile");
  }
};

/* ================= UPDATE PROFILE IMAGE ================= */

export const updateProfileImage = async (req: any, res: any) => {
  try {
    const user: any = await User.findById(req.user.id);

    if (!user) return error(res, "User not found");
    if (!req.file) return error(res, "Image required");

    /* 🔥 DELETE OLD IMAGE */
    if (user.imagePublicId) {
      await cloudinary.uploader.destroy(user.imagePublicId).catch(() => {});
    }

    user.image = req.file.path;
    user.imagePublicId = req.file.filename || req.file.public_id;

    await user.save();

    return success(res, "Profile image updated", {
      image: user.image
    });

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

/* ================= SAVE FCM TOKEN ================= */

export const saveFcmToken = async (req: any, res: any) => {
  try {
    const { token } = req.body;

    if (!token) return error(res, "Token required");

    const user: any = await User.findById(req.user.id);
    if (!user) return error(res, "User not found");

    // 🔥 REMOVE DUPLICATE
    let tokens = user.fcmTokens || [];
    tokens = tokens.filter((t: string) => t !== token);

    // 🔥 ADD NEW TOKEN AT FRONT
    tokens.unshift(token);

    // 🔥 LIMIT TO LAST 5 DEVICES
    tokens = tokens.slice(0, 5);

    user.fcmTokens = tokens;

    await user.save();

    return success(res, "Token saved");
  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};