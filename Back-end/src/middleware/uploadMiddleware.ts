// src/middleware/uploadMiddleware.ts
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "agents", // 📂 dossier Cloudinary
      format: file.mimetype.split("/")[1], // jpg, png, etc.
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

export const upload = multer({ storage });
