/*
 * Activity model for the dashboard's recent activity feed.
 * Captures system-wide events across all sections.
 * The dashboard displays the last 10 entries.
 */
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const ACTIVITY_TYPES = [
  "lead_created",
  "lead_status_changed",
  "lead_contacted",
  "client_created",
  "client_updated",
  "client_status_changed",
  "payment_received",
  "openclaw_action",
  "expense_added",
  "site_health_changed",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface IActivity extends Document {
  type: ActivityType;
  description: string;
  relatedEntityType?: "lead" | "client";
  relatedEntityId?: Types.ObjectId;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    description: { type: String, required: true },
    relatedEntityType: { type: String, enum: ["lead", "client"] },
    relatedEntityId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

export const Activity: Model<IActivity> =
  mongoose.models.Activity ||
  mongoose.model<IActivity>("Activity", ActivitySchema);
