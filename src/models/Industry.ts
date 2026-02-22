/*
 * Industry model for custom industry names.
 * Stores user-created industries that extend the default list
 * defined in lead-constants.ts.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IIndustry extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const IndustrySchema = new Schema<IIndustry>(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const Industry: Model<IIndustry> =
  mongoose.models.Industry || mongoose.model<IIndustry>("Industry", IndustrySchema);
