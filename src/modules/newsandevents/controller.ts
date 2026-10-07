import { Request, Response } from "express";
import mongoose from "mongoose";
import NewsEvent from "./model";
import { createNewsEventSchema, updateNewsEventSchema } from "./sanitize";
import { AuthRequest } from "../../middlewares/auth";
import { generateUniqueSlug } from "../../utils/slug";
import {
  allUploadedPaths,
  filesByField,
  removeFiles,
  toPublicPaths,
} from "../../utils/upload";

const FOLDER = "newsandevents";

// ---------- CREATE ----------
export const createNewsEvent = async (req: AuthRequest, res: Response) => {
  try {
    const createdBy = req.user?.id;
    if (!createdBy) {
      await removeFiles(allUploadedPaths(req, FOLDER));
      return res.status(401).json({ message: "Not authorized" });
    }

    const { error, value } = createNewsEventSchema.validate({ ...req.body });
    if (error) {
      await removeFiles(allUploadedPaths(req, FOLDER));
      return res.status(400).json({ message: error.message });
    }

    const files = filesByField(req);
    const thumbnail = toPublicPaths(FOLDER, files.thumbnail)[0];
    if (!thumbnail) {
      await removeFiles(allUploadedPaths(req, FOLDER));
      return res.status(400).json({ message: "Thumbnail image is required" });
    }
    const slug = await generateUniqueSlug(NewsEvent, value.title);

    const item = await NewsEvent.create({
      ...value,
      slug,
      thumbnail,
      galleries: toPublicPaths(FOLDER, files.galleries),
      pressRelease: toPublicPaths(FOLDER, files.pressRelease),
      createdBy,
    });

    res.status(201).json(item);
  } catch (err: any) {
    await removeFiles(allUploadedPaths(req, FOLDER));
    res.status(500).json({ message: err.message });
  }
};

// ---------- LIST ----------
// ?category=event|news &search=text &from=2026-01-01 &to=2026-12-31 &page=1 &limit=10
// ?upcoming=true  -> only events starting today or later, soonest first (used by the website)
export const listNewsEvents = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, category, search, from, to, upcoming } = req.query;
    const filter: any = {};

    if (category === "event" || category === "news") filter.category = category;

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.title = { $regex: escaped, $options: "i" };
    }

    if (from || to) {
      filter.startDate = {};
      if (from) filter.startDate.$gte = new Date(String(from));
      if (to) filter.startDate.$lte = new Date(String(to));
    }

    // Upcoming = events whose start date is today or in the future
    const onlyUpcoming = upcoming === "true" || upcoming === "1";
    if (onlyUpcoming) {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      filter.category = "event";
      filter.startDate = { ...(filter.startDate || {}), $gte: startOfToday };
    }

    const result = await NewsEvent.paginate(filter, {
      page: Number(page),
      limit: Number(limit),
      sort: onlyUpcoming ? { startDate: 1, createdAt: -1 } : { startDate: -1, createdAt: -1 },
      populate: [{ path: "creator", select: "firstname lastname role" }],
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET ONE (by id or slug) ----------
export const getNewsEvent = async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    const query = mongoose.isValidObjectId(idOrSlug)
      ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
      : { slug: idOrSlug };

    const item = await NewsEvent.findOne(query).populate(
      "creator",
      "firstname lastname role"
    );
    if (!item) return res.status(404).json({ message: "Not found" });

    res.json(item);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- UPDATE ----------
export const updateNewsEvent = async (req: AuthRequest, res: Response) => {
  const newFiles = allUploadedPaths(req, FOLDER);
  try {
    const { error, value } = updateNewsEventSchema.validate({ ...req.body });
    if (error) {
      await removeFiles(newFiles);
      return res.status(400).json({ message: error.message });
    }

    const item = await NewsEvent.findById(req.params.id);
    if (!item) {
      await removeFiles(newFiles);
      return res.status(404).json({ message: "Not found" });
    }

    if (value.category !== undefined) item.category = value.category;
    if (value.description !== undefined) item.description = value.description;
    if (value.startDate !== undefined) item.startDate = value.startDate;
    if (value.endDate !== undefined) item.endDate = value.endDate;

    if (value.title !== undefined && value.title !== item.title) {
      item.title = value.title;
      item.slug = await generateUniqueSlug(NewsEvent, value.title, item._id);
    }

    // Cross-field rules checked against the final (merged) values
    if (item.category === "event" && !item.startDate) {
      await removeFiles(newFiles);
      return res.status(400).json({ message: "startDate is required for events" });
    }
    if (item.startDate && item.endDate && item.endDate < item.startDate) {
      await removeFiles(newFiles);
      return res
        .status(400)
        .json({ message: "endDate must be on or after startDate" });
    }

    // Remove selected files, then append new uploads
    const files = filesByField(req);

    // New thumbnail? Swap it and remember the old one for deletion
    const newThumbnail = toPublicPaths(FOLDER, files.thumbnail)[0];
    const oldThumbnail = newThumbnail ? item.thumbnail : "";
    if (newThumbnail) item.thumbnail = newThumbnail;

    const removedGalleries = item.galleries.filter((g) =>
      value.removeGalleries.includes(g)
    );
    const removedPress = item.pressRelease.filter((p) =>
      value.removePressRelease.includes(p)
    );

    item.galleries = item.galleries.filter((g) => !removedGalleries.includes(g));
    item.pressRelease = item.pressRelease.filter((p) => !removedPress.includes(p));
    item.galleries.push(...toPublicPaths(FOLDER, files.galleries));
    item.pressRelease.push(...toPublicPaths(FOLDER, files.pressRelease));

    await item.save();
    await removeFiles([...removedGalleries, ...removedPress, oldThumbnail]); // after DB save

    res.json(item);
  } catch (err: any) {
    await removeFiles(newFiles);
    res.status(500).json({ message: err.message });
  }
};

// ---------- DELETE ----------
export const deleteNewsEvent = async (req: AuthRequest, res: Response) => {
  try {
    const item = await NewsEvent.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });

    await removeFiles([item.thumbnail, ...item.galleries, ...item.pressRelease]);

    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
