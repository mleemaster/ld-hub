/*
 * Client-safe types for client and intake form records.
 * Shared across page, table, and detail panel components.
 */

export interface IntakeForm {
  businessName?: string;
  primaryContactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  businessDescription?: string;
  servicesOffered?: string;
  planChosen?: string;
  domainPreference?: string;
  domainBackup1?: string;
  domainBackup2?: string;
  logoUrl?: string;
  brandedContentUrls?: string[];
  socialLinks?: string;
  websiteExamples?: string;
  styleRequests?: string;
  callToAction?: string;
  serviceArea?: string;
  tagline?: string;
}

export interface Client {
  _id: string;
  name: string;
  businessName: string;
  phone?: string;
  email?: string;
  industry?: string;
  planTier: string;
  ppcClient: boolean;
  ppcManagementFee?: number;
  ppcAdSpend?: number;
  monthlyRevenue?: number;
  setupFeeAmount?: number;
  startDate?: string;
  nextBillingDate?: string;
  projectStatus: string;
  websiteUrl?: string;
  contactFormEndpoint?: string;
  currentHealthStatus?: string;
  lastHealthCheck?: string;
  domainInfo?: string;
  notes?: string;
  intakeForm?: IntakeForm;
  leadId?: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFormData {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  industry: string;
  planTier: string;
  ppcClient: boolean;
  ppcManagementFee: string;
  ppcAdSpend: string;
  monthlyRevenue: string;
  setupFeeAmount: string;
  startDate: string;
  nextBillingDate: string;
  projectStatus: string;
  websiteUrl: string;
  contactFormEndpoint: string;
  domainInfo: string;
  notes: string;
}
