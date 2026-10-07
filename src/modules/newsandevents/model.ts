import mongoose, { Document, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export const NEWS_EVENT_CATEGORIES = ["event", "news"] as const;
export type NewsEventCategory = (typeof NEWS_EVENT_CATEGORIES)[number];

export interface INewsEvent extends Document {
  category: NewsEventCategory;
  title: string;
  slug: string;
  description?: string;
  thumbnail: string; // /uploads/newsandevents/<file>
  galleries: string[]; // /uploads/newsandevents/<file>
  pressRelease: string[]; // /uploads/newsandevents/<file> (images or pdf/doc)
  startDate?: Date;
  endDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NewsEventSchema = new Schema<INewsEvent>(
  {
    category: { type: String, enum: NEWS_EVENT_CATEGORIES, required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    galleries: { type: [String], default: [] },
    pressRelease: { type: [String], default: [] },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

NewsEventSchema.virtual("creator", {
  ref: "User",
  localField: "createdBy",
  foreignField: "_id",
  justOne: true,
});

NewsEventSchema.plugin(mongoosePaginate);

export default mongoose.model<INewsEvent, mongoose.PaginateModel<INewsEvent>>(
  "NewsEvent",
  NewsEventSchema
);
