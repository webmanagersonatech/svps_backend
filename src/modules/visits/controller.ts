import { Request, Response } from "express";
import Visit from "./model";
import { createVisitSchema, updateVisitSchema } from "./sanitize";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const startOfToday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0); // visit dates are stored as UTC midnight (yyyy-mm-dd)
  return d;
};
const castOr404 = (res: Response, err: any) =>
  err.name === "CastError" ? res.status(404).json({ message: "Not found" }) : res.status(500).json({ message: err.message });

// ---------- PUBLIC: "Book a visit" / "Schedule a campus visit" popup ----------
export const createVisit = async (req: Request, res: Response) => {
  try {
    const { error, value } = createVisitSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const ok = { success: true, message: "Request received! Our admissions team will contact you within 24 hours." };
    if (value.website) return res.status(201).json(ok); // honeypot

    if (new Date(value.preferredDate) < startOfToday()) {
      return res.status(400).json({ message: "Preferred date cannot be in the past" });
    }

    const { website, ...data } = value;
    await Visit.create(data);
    res.status(201).json(ok);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: list (?status= &search= &from= &to= on preferred/scheduled date) ----------
export const listVisits = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, search, upcoming } = req.query;
    const filter: any = {};
    if (status) filter.status = String(status);
    if (upcoming === "true") filter.preferredDate = { $gte: startOfToday() };
    if (search) {
      const rx = { $regex: escapeRegex(String(search)), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { purpose: rx }];
    }
    const result = await Visit.paginate(filter, {
      page: Number(page),
      limit: Number(limit),
      sort: upcoming === "true" ? { preferredDate: 1 } : { createdAt: -1 },
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: counts (how many people booked a visit) ----------
export const visitStats = async (_req: Request, res: Response) => {
  try {
    const today = startOfToday();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const [total, pending, confirmed, completed, cancelled, upcoming, visitingToday, uniquePeople] = await Promise.all([
      Visit.countDocuments(),
      Visit.countDocuments({ status: "pending" }),
      Visit.countDocuments({ status: "confirmed" }),
      Visit.countDocuments({ status: "completed" }),
      Visit.countDocuments({ status: "cancelled" }),
      // still active (pending / confirmed) and the visit day is today or later
      Visit.countDocuments({ status: { $in: ["pending", "confirmed"] }, preferredDate: { $gte: today } }),
      Visit.countDocuments({ status: { $in: ["pending", "confirmed"] }, preferredDate: { $gte: today, $lt: tomorrow } }),
      Visit.distinct("email").then((e) => e.length),
    ]);
    res.json({ total, pending, confirmed, completed, cancelled, upcoming, today: visitingToday, uniquePeople });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: confirm / reschedule / complete / cancel / add note ----------
export const updateVisit = async (req: Request, res: Response) => {
  try {
    const { error, value } = updateVisitSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const update: any = {};
    if (value.status) update.status = value.status;
    if (value.adminNote !== undefined) update.adminNote = value.adminNote;
    if (value.scheduledDate !== undefined) update.scheduledDate = value.scheduledDate || null;

    const doc = await Visit.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err: any) {
    castOr404(res, err);
  }
};

// ---------- ADMIN: delete ----------
export const deleteVisit = async (req: Request, res: Response) => {
  try {
    const doc = await Visit.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Visit booking deleted" });
  } catch (err: any) {
    castOr404(res, err);
  }
};
