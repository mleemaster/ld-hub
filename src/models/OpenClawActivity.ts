/*
 * OpenClaw Activity Log model.
 * Records every action taken by the OpenClaw AI system:
 * scraping, messaging, follow-ups, errors.
 * Feeds the OpenClaw activity dashboard and cost tracking.
 */
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const OPENCLAW_ACTIVITY_TYPES = [
  "lead_scraped",
  "message_sent",
  "follow_up_sent",
  "lead_added",
  "error",
] as const;

export type OpenClawActivityType = (typeof OPENCLAW_ACTIVITY_TYPES)[number];

export interface IOpenClawActivity extends Document {
  type: OpenClawActivityType;
  details: string;
  relatedLeadId?: Types.ObjectId;
  cost?: number;
  aiModel?: string;
  tokenCount?: number;
  createdAt: Date;
}

const OpenClawActivitySchema = new Schema<IOpenClawActivity>(
  {
    type: { type: String, enum: OPENCLAW_ACTIVITY_TYPES, required: true },
    details: { type: String, required: true },
    relatedLeadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    cost: Number,
    aiModel: String,
    tokenCount: Number,
  },
  { timestamps: true }
);

export const OpenClawActivity: Model<IOpenClawActivity> =
  mongoose.models.OpenClawActivity ||
  mongoose.model<IOpenClawActivity>("OpenClawActivity", OpenClawActivitySchema);
