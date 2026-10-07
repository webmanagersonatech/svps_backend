import Joi from "joi";
import { VISIT_STATUSES } from "./model";

export const createVisitSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().max(120).required(),
  phone: Joi.string().trim().pattern(/^[\d\s+\-()]{10,20}$/).required().messages({
    "string.pattern.base": "Enter a valid phone number",
  }),
  preferredDate: Joi.date().iso().required(),
  purpose: Joi.string().trim().max(120).allow("").default("Campus Visit"),
  message: Joi.string().trim().max(1000).allow("").default(""),
  // honeypot
  website: Joi.string().allow("").optional(),
});

export const updateVisitSchema = Joi.object({
  status: Joi.string().valid(...VISIT_STATUSES),
  scheduledDate: Joi.date().iso().allow(null, ""),
  adminNote: Joi.string().trim().max(1000).allow(""),
}).min(1);
