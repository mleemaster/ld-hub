/*
 * OpenClaw task queue — stores tasks for OpenClaw to process.
 * Tasks are ordered by the `order` field and progress through
 * pending → in_progress → completed/failed.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";
import { TASK_STATUSES, type TaskStatus } from "@/lib/openclaw-constants";

export { TASK_STATUSES };
export type { TaskStatus };

export interface IOpenClawTask extends Document {
  prompt: string;
  status: TaskStatus;
  order: number;
  result?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OpenClawTaskSchema = new Schema<IOpenClawTask>(
  {
    prompt: { type: String, required: true },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "pending",
      required: true,
    },
    order: { type: Number, required: true },
    result: String,
    error: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

OpenClawTaskSchema.index({ status: 1, order: 1 });

export const OpenClawTask: Model<IOpenClawTask> =
  mongoose.models.OpenClawTask ||
  mongoose.model<IOpenClawTask>("OpenClawTask", OpenClawTaskSchema);
