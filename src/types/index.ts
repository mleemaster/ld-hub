/*
 * Shared TypeScript types for LeeMaster Design Hub.
 * Re-exports interfaces and enum constants from Mongoose models
 * for use in client components and API response typing.
 */
export type { ILead, LeadStatus, LeadSource, Industry } from "@/models/Lead";
export { LEAD_STATUSES, LEAD_SOURCES, INDUSTRIES } from "@/models/Lead";

export type { IClient, IIntakeForm, PlanTier, ProjectStatus } from "@/models/Client";
export { PLAN_TIERS, PROJECT_STATUSES } from "@/models/Client";

export type { IOpenClawActivity, OpenClawActivityType } from "@/models/OpenClawActivity";
export { OPENCLAW_ACTIVITY_TYPES } from "@/models/OpenClawActivity";

export type { IMessageTemplate, TemplateType } from "@/models/MessageTemplate";
export { TEMPLATE_TYPES } from "@/models/MessageTemplate";

export type { IExpense, ExpenseType, ExpenseCategory } from "@/models/Expense";
export { EXPENSE_TYPES, EXPENSE_CATEGORIES } from "@/models/Expense";

export type { IActivity, ActivityType } from "@/models/Activity";
export { ACTIVITY_TYPES } from "@/models/Activity";
