/*
 * SiteHealthCheck model — stores individual health check results.
 * One document per check per client. Auto-pruned after 30 days via TTL index.
 * Used by cron jobs to record uptime, SSL, and contact form check results.
 */
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const CHECK_TYPES = ["uptime", "ssl", "contact_form"] as const;
export type CheckType = (typeof CHECK_TYPES)[number];

export const HEALTH_STATUSES = ["healthy", "degraded", "down"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export interface ISiteHealthCheck extends Document {
  clientId: Types.ObjectId;
  checkType: CheckType;
  status: HealthStatus;
  responseTimeMs?: number;
  statusCode?: number;
  sslDaysRemaining?: number;
  sslExpiry?: Date;
  errorMessage?: string;
  checkedAt: Date;
}

const SiteHealthCheckSchema = new Schema<ISiteHealthCheck>({
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  checkType: { type: String, enum: CHECK_TYPES, required: true },
  status: { type: String, enum: HEALTH_STATUSES, required: true },
  responseTimeMs: Number,
  statusCode: Number,
  sslDaysRemaining: Number,
  sslExpiry: Date,
  errorMessage: String,
  checkedAt: { type: Date, required: true, default: Date.now },
});

SiteHealthCheckSchema.index({ clientId: 1, checkType: 1, checkedAt: -1 });
SiteHealthCheckSchema.index({ checkedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const SiteHealthCheck: Model<ISiteHealthCheck> =
  mongoose.models.SiteHealthCheck ||
  mongoose.model<ISiteHealthCheck>("SiteHealthCheck", SiteHealthCheckSchema);
