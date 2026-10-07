import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "../config/s3";

/**
 * Document-style mimetypes: PDF, Word, PowerPoint, Excel, Zip.
 * These don't share a common "type/" prefix like image/ or video/ do,
 * so they're matched individually.
 */
const DOCUMENT_MIMETYPES = [
  "application/pdf", // .pdf
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/zip", // .zip
  "application/x-zip-compressed", // .zip (some Windows browsers)
  "application/x-rar-compressed", // .rar
  "application/vnd.rar", // .rar (alt)
];

const isDocumentMimetype = (mimetype: string) =>
  DOCUMENT_MIMETYPES.includes(mimetype);

/**
 * Decides the S3 "folder" (key prefix) based on the file's mimetype,
 * matching the images/, videos/ and documents/ folders already in the bucket.
 */
const resolvePrefix = (mimetype: string) => {
  if (mimetype.startsWith("video/")) return "videos";
  if (mimetype.startsWith("image/")) return "images";
  if (isDocumentMimetype(mimetype)) return "documents";
  return "misc";
};

/**
 * Reusable multer-s3 storage engine. Streams the upload straight to S3 —
 * nothing is ever written to local disk.
 */
export const s3Storage = multerS3({
  s3,
  bucket: S3_BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const prefix = resolvePrefix(file.mimetype);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
      file.originalname
    )}`;
    cb(null, `${prefix}/${uniqueName}`);
  },
});

export const uploadToS3 = multer({
  storage: s3Storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB, generous enough for short videos
});

export const uploadVideoToS3 = multer({
  storage: s3Storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for video
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed"));
    }
    cb(null, true);
  },
});

export const uploadDocumentToS3 = multer({
  storage: s3Storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB for pdf/word/ppt/excel/zip
  fileFilter: (req, file, cb) => {
    if (!isDocumentMimetype(file.mimetype)) {
      return cb(
        new Error(
          "Only PDF, Word, PowerPoint, Excel, or Zip files are allowed"
        )
      );
    }
    cb(null, true);
  },
});

/**
 * Extracts the S3 key from either a full URL we generated, or a bare key.
 * Safe to call with undefined/empty values.
 */
export const keyFromStoredValue = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.startsWith("http")) {
    try {
      const url = new URL(value);
      return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    } catch {
      return null;
    }
  }
  return value.replace(/^\/+/, "");
};

/**
 * Deletes an object from S3. Swallows errors so a failed cleanup never
 * blocks the primary DB operation (e.g. deleting a gallery record).
 */
export const deleteFromS3 = async (storedValue?: string | null) => {
  const key = keyFromStoredValue(storedValue);
  if (!key) return;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.error("Failed to delete S3 object:", key, err);
  }
};
