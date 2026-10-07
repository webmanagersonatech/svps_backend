import { Router } from "express";
import {
  createActivity,
  listActivities,
  getActivity,
  updateActivity,
  deleteActivity,
} from "./controller";
import { protect } from "../../middlewares/auth";
import { createUploader, IMAGE_MIMETYPES } from "../../utils/upload";

const router = Router();

// form-data fields: "thumbnail" (1 image), "galleries" (up to 20 images), files saved to uploads/activities
const upload = createUploader(
  "activities",
  { thumbnail: IMAGE_MIMETYPES, galleries: IMAGE_MIMETYPES },
  10
).fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "galleries", maxCount: 20 },
]);

// Public (website) reads
router.get("/", listActivities);
router.get("/:idOrSlug", getActivity);

// Admin writes
router.post("/", protect, upload, createActivity);
router.put("/:id", protect, upload, updateActivity);
router.delete("/:id", protect, deleteActivity);

export default router;
