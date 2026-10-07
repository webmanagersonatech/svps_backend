import Joi from "joi";

export const createActivitySchema = Joi.object({
  topic: Joi.string().trim().required(),
  description: Joi.string().allow("").default(""),
});

export const updateActivitySchema = Joi.object({
  topic: Joi.string().trim(),
  description: Joi.string().allow(""),
  // gallery paths to delete, e.g. removeGalleries=/uploads/activities/abc.jpg (repeat the field for many)
  removeGalleries: Joi.array().items(Joi.string()).single().default([]),
});
