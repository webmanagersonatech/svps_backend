import { Request, Response } from "express";
import Contact from "./model";
import { createContactSchema, updateContactSchema } from "./sanitize";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- PUBLIC: website "Contact us" form ----------
export const createContact = async (req: Request, res: Response) => {
  try {
    const { error, value } = createContactSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Honeypot filled -> pretend success, store nothing
    if (value.website) return res.status(201).json({ success: true, message: "Thank you! We will contact you shortly." });

    const { website, ...data } = value;
    await Contact.create(data);
    res.status(201).json({ success: true, message: "Thank you! We will contact you shortly." });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: list (paginated, ?status= & ?search=) ----------
export const listContacts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const filter: any = {};
    if (status) filter.status = String(status);
    if (search) {
      const rx = { $regex: escapeRegex(String(search)), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { subject: rx }, { message: rx }];
    }
    const result = await Contact.paginate(filter, { page: Number(page), limit: Number(limit), sort: { createdAt: -1 } });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: counts (how many people contacted us) ----------
export const contactStats = async (_req: Request, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [total, fresh, read, replied, today, uniquePeople] = await Promise.all([
      Contact.countDocuments(),
      Contact.countDocuments({ status: "new" }),
      Contact.countDocuments({ status: "read" }),
      Contact.countDocuments({ status: "replied" }),
      Contact.countDocuments({ createdAt: { $gte: startOfToday } }),
      Contact.distinct("email").then((e) => e.length),
    ]);
    res.json({ total, new: fresh, read, replied, today, uniquePeople });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: mark new / read / replied ----------
export const updateContact = async (req: Request, res: Response) => {
  try {
    const { error, value } = updateContactSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const doc = await Contact.findByIdAndUpdate(req.params.id, { status: value.status }, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err: any) {
    res.status(err.name === "CastError" ? 404 : 500).json({ message: err.name === "CastError" ? "Not found" : err.message });
  }
};

// ---------- ADMIN: delete ----------
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const doc = await Contact.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Contact message deleted" });
  } catch (err: any) {
    res.status(err.name === "CastError" ? 404 : 500).json({ message: err.name === "CastError" ? "Not found" : err.message });
  }
};
