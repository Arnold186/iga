import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { env } from "../config/env";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

const storage = multer.memoryStorage();

export const upload = multer({ storage });

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

