import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

/** <project root>/uploads  (served publicly at /uploads, see app.ts) */
export const UPLOAD_ROOT = path.join(__dirname, "../../uploads");

export const IMAGE_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const DOCUMENT_MIMETYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

type FieldRules = Record<string, string[]>;

/**
 * Creates a multer instance that saves files on local disk in
 * uploads/<folder>/ . `rules` maps each form field name to the mimetypes
 * it accepts, e.g. { galleries: IMAGE_MIMETYPES }.
 */
export const createUploader = (
  folder: string,
  rules: FieldRules,
  maxFileSizeMB = 10
) => {
  const dir = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path
        .extname(file.originalname)
        .toLowerCase()
        .replace(/[^.a-z0-9]/g, "");
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = rules[file.fieldname];
      if (!allowed) {
        return cb(new Error(`Unexpected file field: ${file.fieldname}`));
      }
      if (!allowed.includes(file.mimetype)) {
        return cb(
          new Error(`Invalid file type for "${file.fieldname}": ${file.mimetype}`)
        );
      }
      cb(null, true);
    },
  });
};

/** Files grouped by form field name (works with upload.fields()). */
export const filesByField = (req: Request): Record<string, Express.Multer.File[]> =>
  req.files && !Array.isArray(req.files)
    ? (req.files as Record<string, Express.Multer.File[]>)
    : {};

/** Public URL path stored in the DB, e.g. /uploads/activities/123-456.jpg */
export const toPublicPath = (folder: string, file: Express.Multer.File) =>
  `/uploads/${folder}/${file.filename}`;

export const toPublicPaths = (folder: string, files: Express.Multer.File[] = []) =>
  files.map((f) => toPublicPath(folder, f));

/** Every file multer saved during this request (used to clean up on errors). */
export const allUploadedPaths = (req: Request, folder: string): string[] =>
  Object.values(filesByField(req)).flatMap((files) => toPublicPaths(folder, files));

/**
 * Deletes files from disk given their stored public paths.
 * Never throws and refuses to touch anything outside the uploads folder.
 */
export const removeFiles = async (publicPaths: string[] = []) => {
  await Promise.all(
    publicPaths.map(async (p) => {
      if (!p) return;
      const relative = p.replace(/^\/?uploads\//, "");
      const full = path.resolve(UPLOAD_ROOT, relative);
      if (!full.startsWith(UPLOAD_ROOT + path.sep)) return;
      try {
        await fs.promises.unlink(full);
      } catch (err: any) {
        if (err.code !== "ENOENT") console.error("Failed to delete file:", full, err);
      }
    })
  );
};
