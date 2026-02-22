/*
 * Expense-related constants and types shared between server (model) and client (UI).
 * Extracted from the Expense model to avoid pulling mongoose into client bundles.
 */

export const EXPENSE_TYPES = ["recurring", "one-time"] as const;

export const EXPENSE_CATEGORIES = [
  "Hosting",
  "API Costs",
  "Stripe Fees",
  "Phone",
  "Domain",
  "Software",
  "Hardware",
  "VA",
  "Other",
] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
