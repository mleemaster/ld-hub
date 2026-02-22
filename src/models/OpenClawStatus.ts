/*
 * OpenClaw heartbeat singleton — tracks connection status.
 * Single document, upserted on each heartbeat ping from OpenClaw.
 * Connected if lastHeartbeat is within 15 minutes.
 */
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IOpenClawStatus extends Document {
  lastHeartbeat: Date;
  currentTaskId?: Types.ObjectId;
  currentTaskSummary?: string;
}

const OpenClawStatusSchema = new Schema<IOpenClawStatus>({
  lastHeartbeat: { type: Date, required: true },
  currentTaskId: { type: Schema.Types.ObjectId, ref: "OpenClawTask" },
  currentTaskSummary: String,
});

export const OpenClawStatus: Model<IOpenClawStatus> =
  mongoose.models.OpenClawStatus ||
  mongoose.model<IOpenClawStatus>("OpenClawStatus", OpenClawStatusSchema);
