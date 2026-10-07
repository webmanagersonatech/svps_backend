import mongoose, { Document, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export const CONTACT_STATUSES = ["new", "read", "replied"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, default: "", trim: true },
    subject: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: CONTACT_STATUSES, default: "new", index: true },
  },
  { timestamps: true }
);

ContactSchema.plugin(mongoosePaginate);

export default mongoose.model<IContact, mongoose.PaginateModel<IContact>>("Contact", ContactSchema);
