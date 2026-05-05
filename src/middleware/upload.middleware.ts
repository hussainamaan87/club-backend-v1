import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary";

/* ================= FILE FILTER ================= */
const fileFilter = (req: any, file: any, cb: any) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files allowed"), false);
  }
  cb(null, true);
};

/* ================= STORAGE ================= */
const createStorage = (folder: string) =>
  new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder,
      allowed_formats: ["jpg", "png", "jpeg"]
    })
  });

/* ================= UPLOADS ================= */
export const uploadClub = multer({
  storage: createStorage("clubs"),
  fileFilter, // ✅ ADD THIS
  limits: { fileSize: 2 * 1024 * 1024 }
});

export const uploadEvent = multer({
  storage: createStorage("events"),
  fileFilter, // ✅ ADD THIS
  limits: { fileSize: 2 * 1024 * 1024 }
});

export const uploadUser = multer({
  storage: createStorage("users"),
  fileFilter, // ✅ ADD THIS
  limits: { fileSize: 2 * 1024 * 1024 }
});