import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { env } from "../config/env";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

const storage = multer.memoryStorage();

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];

export const upload = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMIT }
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF"));
  }
});

export const uploadDocument = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_DOC_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX"));
  }
});

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  resourceType: "image" | "auto" | "raw" = "image"
) {
  return new Promise<{
    url: string;
    public_id: string;
    resource_type: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Upload failed"));
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type
        });
      }
    );

    stream.end(fileBuffer);
  });
}

