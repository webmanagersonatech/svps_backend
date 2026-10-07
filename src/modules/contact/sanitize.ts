import Joi from "joi";
import { CONTACT_STATUSES } from "./model";

export const createContactSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().max(120).required(),
  phone: Joi.string().trim().pattern(/^[\d\s+\-()]{7,20}$/).allow("").default(""),
  subject: Joi.string().trim().max(150).allow("").default(""),
  message: Joi.string().trim().min(5).max(2000).required(),
  // honeypot: real visitors never fill this hidden field, bots do
  website: Joi.string().allow("").optional(),
});

export const updateContactSchema = Joi.object({
  status: Joi.string().valid(...CONTACT_STATUSES).required(),
});
