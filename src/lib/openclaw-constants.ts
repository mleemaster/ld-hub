/*
 * OpenClaw-related constants and types shared between server (model) and client (UI).
 * Extracted from models to avoid pulling mongoose into client bundles.
 */

export const TEMPLATE_TYPES = [
  "initial_contact",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
  "custom",
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "failed",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
