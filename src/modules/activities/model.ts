import mongoose, { Document, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface IActivity extends Document {
  topic: string;
  slug: string;
  description?: string;
  thumbnail: string; // /uploads/activities/<file>
  galleries: string[]; // /uploads/activities/<file>
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    topic: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    galleries: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ActivitySchema.virtual("creator", {
  ref: "User",
  localField: "createdBy",
  foreignField: "_id",
  justOne: true,
});

ActivitySchema.plugin(mongoosePaginate);

export default mongoose.model<IActivity, mongoose.PaginateModel<IActivity>>(
  "Activity",
  ActivitySchema
);
