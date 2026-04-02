/*
 * Client-safe types for lead and activity records.
 * Shared across page, table, kanban, and detail components.
 */
import type { IntakeForm } from "@/lib/client-types";

export interface AnalysisData {
  metro?: string;
  monthlySearches?: number;
  estimatedCompetitors?: number;
  avgJobValue?: number;
  revenueLow?: number;
  revenueHigh?: number;
  analyzedAt?: string;
}

export interface Lead {
  _id: string;
  name: string;
  businessName?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: string;
  source: string;
  sourceDetail?: string;
  city?: string;
  callScheduledDate?: string;
  followUpDate?: string;
  industry?: string;
  state?: string;
  notes?: string;
  lastContactedDate?: string;
  isHot?: boolean;
  outreachTemplateId?: string;
  outreachTemplateName?: string;
  intakeForm?: IntakeForm;
  analysisData?: AnalysisData;
  contactAttempts?: number;
  firstContactedDate?: string;
  stageEnteredAt?: string;
  nextFollowUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityRecord {
  _id: string;
  type: string;
  description: string;
  createdAt: string;
}
