/*
 * Client-related constants and types shared between server (model) and client (UI).
 * Extracted from the Client model to avoid pulling mongoose into client bundles.
 */

export const PLAN_TIERS = [
  "Landing Page",
  "Multi-Page",
  "eCommerce",
] as const;

export const PROJECT_STATUSES = [
  "Awaiting Design",
  "Awaiting Revision",
  "Awaiting Final Dev",
  "Deployed Active",
  "Deployed Canceled",
] as const;

export const ADD_ONS = [
  { name: "AI Lead Responder", slug: "ai-lead-responder", defaultPrice: 49 },
  { name: "Missed Call Text-Back", slug: "missed-call-text-back", defaultPrice: 59 },
  { name: "SEO Growth Pack", slug: "seo-growth-pack", defaultPrice: 69 },
] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
