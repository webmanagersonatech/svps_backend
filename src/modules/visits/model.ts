import mongoose, { Document, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export const VISIT_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export interface IVisit extends Document {
  name: string;
  email: string;
  phone: string;
  preferredDate: Date; // date the visitor asked for
  scheduledDate?: Date; // date the admin confirmed (can differ from preferredDate)
  purpose: string; // which button/form it came from, e.g. "Schedule Your Campus Visit"
  message?: string;
  status: VisitStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema = new Schema<IVisit>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    preferredDate: { type: Date, required: true, index: true },
    scheduledDate: { type: Date },
    purpose: { type: String, default: "Campus Visit", trim: true },
    message: { type: String, default: "", trim: true },
    status: { type: String, enum: VISIT_STATUSES, default: "pending", index: true },
    adminNote: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

VisitSchema.plugin(mongoosePaginate);

export default mongoose.model<IVisit, mongoose.PaginateModel<IVisit>>("Visit", VisitSchema);
