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

export interface IActiveAddOn {
  name: string;
  slug: string;
  monthlyPrice: number;
  stripeSubscriptionId?: string;
  activeSince?: Date;
  includedWithPlan?: boolean;
}

export interface IOnboarding {
  domainPurchased: boolean;
  designMockupSent: boolean;
  contentCollected: boolean;
  revisionsApproved: boolean;
  siteDeployed: boolean;
  analyticsInstalled: boolean;
}

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
  activeAddOns?: IActiveAddOn[];
  addOnRevenue?: number;
  convertedFromSource?: string;
  convertedFromTemplateName?: string;
  onboarding?: IOnboarding;
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
    activeAddOns: [{
      name: String,
      slug: String,
      monthlyPrice: Number,
      stripeSubscriptionId: String,
      activeSince: Date,
      includedWithPlan: Boolean,
    }],
    addOnRevenue: Number,
    convertedFromSource: String,
    convertedFromTemplateName: String,
    onboarding: {
      domainPurchased: { type: Boolean, default: false },
      designMockupSent: { type: Boolean, default: false },
      contentCollected: { type: Boolean, default: false },
      revisionsApproved: { type: Boolean, default: false },
      siteDeployed: { type: Boolean, default: false },
      analyticsInstalled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

ClientSchema.index({ phone: 1 });
ClientSchema.index({ email: 1 });
ClientSchema.index({ businessName: 1 });

export const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
