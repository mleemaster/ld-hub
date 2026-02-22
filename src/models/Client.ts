/*
 * Client model for paying customers.
 * Created when a Lead converts via Stripe payment or manually.
 * Contains the full profile including nested intake form data
 * populated by the Tally webhook. Linked to the originating Lead.
 */
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { PLAN_TIERS, PROJECT_STATUSES, type PlanTier, type ProjectStatus } from "@/lib/client-constants";
import { IntakeFormSchema, type IIntakeForm } from "@/models/IntakeFormSchema";
export type { PlanTier, ProjectStatus, IIntakeForm };
export { PLAN_TIERS, PROJECT_STATUSES };

export interface IClient extends Document {
  name: string;
  businessName: string;
  phone?: string;
  email?: string;
  industry?: string;
  planTier: PlanTier;
  ppcClient: boolean;
  ppcManagementFee?: number;
  ppcAdSpend?: number;
  monthlyRevenue?: number;
  startDate?: Date;
  nextBillingDate?: Date;
  projectStatus: ProjectStatus;
  websiteUrl?: string;
  domainInfo?: string;
  notes?: string;
  intakeForm?: IIntakeForm;
  contactFormEndpoint?: string;
  canceledAt?: Date;
  setupFeeAmount?: number;
  currentHealthStatus?: "healthy" | "degraded" | "down";
  lastHealthCheck?: Date;
  leadId?: Types.ObjectId;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true },
    businessName: { type: String, required: true },
    phone: String,
    email: String,
    industry: String,
    planTier: { type: String, enum: PLAN_TIERS, required: true },
    ppcClient: { type: Boolean, default: false },
    ppcManagementFee: Number,
    ppcAdSpend: Number,
    monthlyRevenue: Number,
    startDate: Date,
    nextBillingDate: Date,
    projectStatus: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "Awaiting Design",
      required: true,
    },
    websiteUrl: String,
    domainInfo: String,
    notes: String,
    intakeForm: IntakeFormSchema,
    contactFormEndpoint: String,
    canceledAt: Date,
    setupFeeAmount: Number,
    currentHealthStatus: { type: String, enum: ["healthy", "degraded", "down"] },
    lastHealthCheck: Date,
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    stripeCustomerId: String,
  },
  { timestamps: true }
);

ClientSchema.index({ phone: 1 });
ClientSchema.index({ email: 1 });
ClientSchema.index({ businessName: 1 });

export const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
