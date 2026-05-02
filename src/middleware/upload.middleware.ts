import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary";

const createStorage = (folder: string) =>
  new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder,
      allowed_formats: ["jpg", "png", "jpeg"]
    })
  });

export const uploadClub = multer({
  storage: createStorage("clubs"),
  limits: { fileSize: 2 * 1024 * 1024 }
});

export const uploadEvent = multer({
  storage: createStorage("events"),
  limits: { fileSize: 2 * 1024 * 1024 }
});

export const uploadUser = multer({
  storage: createStorage("users"),
  limits: { fileSize: 2 * 1024 * 1024 }
});