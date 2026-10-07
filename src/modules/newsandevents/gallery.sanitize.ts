import Joi from "joi";

export const uploadGallerySchema = Joi.object({
  photo_name: Joi.string().required(),
  year: Joi.number().required(),
  description: Joi.string().allow(""),
});
