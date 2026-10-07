import { Router } from "express";
import { createContact, listContacts, contactStats, updateContact, deleteContact } from "./controller";
import { protect } from "../../middlewares/auth";
import { rateLimit } from "../../middlewares/rateLimit";

const router = Router();

// Public: website contact form (max 5 per 10 minutes per IP)
router.post("/", rateLimit(5, 10 * 60 * 1000), createContact);

// Admin
router.get("/stats", protect, contactStats); // keep above "/:id"
router.get("/", protect, listContacts);
router.patch("/:id", protect, updateContact);
router.delete("/:id", protect, deleteContact);

export default router;
