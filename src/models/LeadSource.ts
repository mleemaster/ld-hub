/*
 * LeadSource model for custom lead source names.
 * Stores user-created sources that extend the default list
 * defined in lead-constants.ts.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ILeadSource extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSourceSchema = new Schema<ILeadSource>(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const LeadSource: Model<ILeadSource> =
  mongoose.models.LeadSource || mongoose.model<ILeadSource>("LeadSource", LeadSourceSchema);
