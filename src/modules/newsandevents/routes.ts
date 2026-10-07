import { Router } from "express";
import {
  createNewsEvent,
  listNewsEvents,
  getNewsEvent,
  updateNewsEvent,
  deleteNewsEvent,
} from "./controller";
import { protect } from "../../middlewares/auth";
import {
  createUploader,
  IMAGE_MIMETYPES,
  DOCUMENT_MIMETYPES,
} from "../../utils/upload";

const router = Router();

// form-data fields:
//   thumbnail     -> 1 image (required on create)
//   galleries     -> up to 20 images
//   pressRelease  -> up to 10 files (images, pdf, doc, docx)
// files saved to uploads/newsandevents
const upload = createUploader(
  "newsandevents",
  {
    thumbnail: IMAGE_MIMETYPES,
    galleries: IMAGE_MIMETYPES,
    pressRelease: [...IMAGE_MIMETYPES, ...DOCUMENT_MIMETYPES],
  },
  15
).fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "galleries", maxCount: 20 },
  { name: "pressRelease", maxCount: 10 },
]);

// Public (website) reads
router.get("/", listNewsEvents);
router.get("/:idOrSlug", getNewsEvent);

// Admin writes
router.post("/", protect, upload, createNewsEvent);
router.put("/:id", protect, upload, updateNewsEvent);
router.delete("/:id", protect, deleteNewsEvent);

export default router;
