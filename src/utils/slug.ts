import { Model } from "mongoose";

/** "Annual Day 2026!" -> "annual-day-2026" */
export const slugify = (text: string): string =>
  text
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

/**
 * Builds a slug from `text` that is unique in `model`.
 * If "annual-day" is taken it returns "annual-day-2", "annual-day-3", ...
 * Pass `excludeId` when updating so a record doesn't clash with itself.
 */
export const generateUniqueSlug = async (
  model: Model<any>,
  text: string,
  excludeId?: unknown
): Promise<string> => {
  const base = slugify(text);
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (
    await model.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
};
