/*
 * Lead model for the sales pipeline / CRM.
 * Represents a prospect from initial scrape through closing.
 * When status = "Closed Won" and a Stripe payment is received,
 * the lead auto-converts to a Client record.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  INDUSTRIES,
} from "@/lib/lead-constants";
import { IntakeFormSchema, type IIntakeForm } from "@/models/IntakeFormSchema";

export { LEAD_STATUSES, LEAD_SOURCES, INDUSTRIES };
export type { LeadStatus, LeadSource, Industry } from "@/lib/lead-constants";

export interface IAnalysisData {
  metro?: string;
  monthlySearches?: number;
  estimatedCompetitors?: number;
  avgJobValue?: number;
  revenueLow?: number;
  revenueHigh?: number;
  analyzedAt?: Date;
}

export interface ILead extends Document {
  name: string;
  businessName?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: (typeof LEAD_STATUSES)[number];
  callScheduledDate?: Date;
  followUpDate?: Date;
  source: (typeof LEAD_SOURCES)[number];
  sourceDetail?: string;
  city?: string;
  industry?: string;
  state?: string;
  notes?: string;
  lastContactedDate?: Date;
  isHot?: boolean;
  outreachTemplateId?: string;
  outreachTemplateName?: string;
  intakeForm?: IIntakeForm;
  analysisData?: IAnalysisData;
  contactAttempts: number;
  firstContactedDate?: Date;
  stageEnteredAt?: Date;
  nextFollowUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true },
    businessName: String,
    phone: String,
    email: String,
    website: String,
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New",
      required: true,
    },
    callScheduledDate: Date,
    followUpDate: Date,
    source: { type: String, required: true },
    sourceDetail: String,
    city: String,
    industry: String,
    state: String,
    notes: String,
    lastContactedDate: Date,
    isHot: Boolean,
    outreachTemplateId: String,
    outreachTemplateName: String,
    intakeForm: IntakeFormSchema,
    analysisData: {
      metro: String,
      monthlySearches: Number,
      estimatedCompetitors: Number,
      avgJobValue: Number,
      revenueLow: Number,
      revenueHigh: Number,
      analyzedAt: Date,
    },
    contactAttempts: { type: Number, default: 0 },
    firstContactedDate: Date,
    stageEnteredAt: Date,
    nextFollowUpDate: Date,
  },
  { timestamps: true }
);

LeadSchema.index({ phone: 1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ businessName: 1 });

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
