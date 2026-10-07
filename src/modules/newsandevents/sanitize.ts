import Joi from "joi";

const category = Joi.string().valid("event", "news");

export const createNewsEventSchema = Joi.object({
  category: category.required(),
  title: Joi.string().trim().required(),
  description: Joi.string().allow("").default(""),
  // events need a start date; for news it is optional
  startDate: Joi.date().iso().when("category", {
    is: "event",
    then: Joi.required(),
  }),
  endDate: Joi.date().iso().min(Joi.ref("startDate")),
});

export const updateNewsEventSchema = Joi.object({
  category,
  title: Joi.string().trim(),
  description: Joi.string().allow(""),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  // paths to delete (repeat the field for several)
  removeGalleries: Joi.array().items(Joi.string()).single().default([]),
  removePressRelease: Joi.array().items(Joi.string()).single().default([]),
});
