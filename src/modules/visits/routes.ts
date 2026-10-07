import { Router } from "express";
import { createVisit, listVisits, visitStats, updateVisit, deleteVisit } from "./controller";
import { protect } from "../../middlewares/auth";
import { rateLimit } from "../../middlewares/rateLimit";

const router = Router();

// Public: website "book a campus visit" form (max 5 per 10 minutes per IP)
router.post("/", rateLimit(5, 10 * 60 * 1000), createVisit);

// Admin
router.get("/stats", protect, visitStats); // keep above "/:id"
router.get("/", protect, listVisits);
router.patch("/:id", protect, updateVisit);
router.delete("/:id", protect, deleteVisit);

export default router;
