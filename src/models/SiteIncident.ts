/*
 * SiteIncident model — tracks down/degraded periods and alert deduplication.
 * Created when a health check detects a problem. Resolved when the issue clears.
 * Alert cadence: immediate on first detection, 1hr later, then every 6hrs.
 */
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const INCIDENT_TYPES = [
  "down",
  "degraded",
  "ssl_expiring",
  "ssl_expired",
  "contact_form_broken",
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export interface ISiteIncident extends Document {
  clientId: Types.ObjectId;
  type: IncidentType;
  description: string;
  startedAt: Date;
  resolvedAt?: Date;
  lastAlertSentAt?: Date;
  alertCount: number;
}

const SiteIncidentSchema = new Schema<ISiteIncident>({
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  type: { type: String, enum: INCIDENT_TYPES, required: true },
  description: { type: String, required: true },
  startedAt: { type: Date, required: true, default: Date.now },
  resolvedAt: Date,
  lastAlertSentAt: Date,
  alertCount: { type: Number, default: 0 },
});

SiteIncidentSchema.index({ clientId: 1, type: 1, resolvedAt: 1 });

export const SiteIncident: Model<ISiteIncident> =
  mongoose.models.SiteIncident ||
  mongoose.model<ISiteIncident>("SiteIncident", SiteIncidentSchema);
