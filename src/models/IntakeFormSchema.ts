/*
 * Shared IntakeForm Mongoose schema and TypeScript interface.
 * Used by Client, Lead, and OrphanIntake models to store
 * Tally intake form submission data.
 */
import { Schema } from "mongoose";

export interface IIntakeForm {
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

export const IntakeFormSchema = new Schema<IIntakeForm>(
  {
    businessName: String,
    primaryContactName: String,
    email: String,
    phone: String,
    address: String,
    businessDescription: String,
    servicesOffered: String,
    planChosen: String,
    domainPreference: String,
    domainBackup1: String,
    domainBackup2: String,
    logoUrl: String,
    brandedContentUrls: [String],
    socialLinks: String,
    websiteExamples: String,
    styleRequests: String,
    callToAction: String,
    serviceArea: String,
    tagline: String,
  },
  { _id: false }
);
