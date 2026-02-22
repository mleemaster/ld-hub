/*
 * Lead-related constants and types shared between server (model) and client (UI).
 * Extracted from the Lead model to avoid pulling mongoose into client bundles.
 */

export const LEAD_STATUSES = [
  "New",
  "No Response",
  "Rejected",
  "Cold",
  "Warm",
  "Call Scheduled",
  "Closed Won",
  "Closed Lost",
] as const;

export const PIPELINE_STATUSES = [
  "No Response",
  "Rejected",
  "Cold",
  "Warm",
  "Call Scheduled",
  "Closed Won",
  "Closed Lost",
] as const;

export const LEAD_SOURCES = [
  "KSL",
  "HomeAdvisor",
  "Nextdoor",
  "Google Maps",
  "Referral",
  "Other",
] as const;

export const INDUSTRIES = [
  "Landscaping",
  "Plumbing",
  "HVAC",
  "Excavation",
  "Electrical",
  "Roofing",
  "Painting",
  "Cleaning",
  "General Contractor",
  "Other",
] as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const STATE_NAME_TO_ABBR: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY",
};

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type Industry = (typeof INDUSTRIES)[number];
