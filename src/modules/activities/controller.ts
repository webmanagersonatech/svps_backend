import { Request, Response } from "express";
import mongoose from "mongoose";
import Activity from "./model";
import { createActivitySchema, updateActivitySchema } from "./sanitize";
import { AuthRequest } from "../../middlewares/auth";
import { generateUniqueSlug } from "../../utils/slug";
import {
  allUploadedPaths,
  filesByField,
  removeFiles,
  toPublicPaths,
} from "../../utils/upload";

const FOLDER = "activities";

// ---------- CREATE ----------
export const createActivity = async (req: AuthRequest, res: Response) => {
  try {
    const createdBy = req.user?.id;
    if (!createdBy) {
      await removeFiles(allUploadedPaths(req, FOLDER));
      return res.status(401).json({ message: "Not authorized" });
    }

    const { error, value } = createActivitySchema.validate({ ...req.body });
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

    const slug = await generateUniqueSlug(Activity, value.topic);

    const activity = await Activity.create({
      ...value,
      slug,
      thumbnail,
      galleries: toPublicPaths(FOLDER, files.galleries),
      createdBy,
    });

    res.status(201).json(activity);
  } catch (err: any) {
    await removeFiles(allUploadedPaths(req, FOLDER));
    res.status(500).json({ message: err.message });
  }
};

// ---------- LIST ----------
export const listActivities = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter: any = {};

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.topic = { $regex: escaped, $options: "i" };
    }

    const result = await Activity.paginate(filter, {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 },
      populate: [{ path: "creator", select: "firstname lastname role" }],
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET ONE (by id or slug) ----------
export const getActivity = async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    const query = mongoose.isValidObjectId(idOrSlug)
      ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
      : { slug: idOrSlug };

    const activity = await Activity.findOne(query).populate(
      "creator",
      "firstname lastname role"
    );
    if (!activity) return res.status(404).json({ message: "Not found" });

    res.json(activity);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- UPDATE ----------
export const updateActivity = async (req: AuthRequest, res: Response) => {
  const newFiles = allUploadedPaths(req, FOLDER);
  try {
    const { error, value } = updateActivitySchema.validate({ ...req.body });
    if (error) {
      await removeFiles(newFiles);
      return res.status(400).json({ message: error.message });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      await removeFiles(newFiles);
      return res.status(404).json({ message: "Not found" });
    }

    if (value.topic !== undefined && value.topic !== activity.topic) {
      activity.topic = value.topic;
      activity.slug = await generateUniqueSlug(Activity, value.topic, activity._id);
    }
    if (value.description !== undefined) activity.description = value.description;

    // New thumbnail? Swap it and remember the old one for deletion
    const newThumbnail = toPublicPaths(FOLDER, filesByField(req).thumbnail)[0];
    const oldThumbnail = newThumbnail ? activity.thumbnail : "";
    if (newThumbnail) activity.thumbnail = newThumbnail;

    // Remove selected gallery images, then append any new uploads
    const toRemove = activity.galleries.filter((g) => value.removeGalleries.includes(g));
    activity.galleries = activity.galleries.filter((g) => !toRemove.includes(g));
    activity.galleries.push(...toPublicPaths(FOLDER, filesByField(req).galleries));

    await activity.save();
    await removeFiles([...toRemove, oldThumbnail]); // only after the DB save succeeded

    res.json(activity);
  } catch (err: any) {
    await removeFiles(newFiles);
    res.status(500).json({ message: err.message });
  }
};

// ---------- DELETE ----------
export const deleteActivity = async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ message: "Not found" });

    await removeFiles([activity.thumbnail, ...activity.galleries]);

    res.json({ message: "Activity deleted" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
