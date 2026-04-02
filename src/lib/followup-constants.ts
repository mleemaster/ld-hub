/*
 * Follow-up cadence rules for the smart follow-up system.
 * Maps lead status to the number of days until the next follow-up.
 * null = no auto follow-up for that status.
 */

import type { LeadStatus } from "@/lib/lead-constants";

export const FOLLOWUP_CADENCE: Record<LeadStatus, number | null> = {
  "New": null,
  "No Response": null,
  "Cold": 14,
  "Warm": 3,
  "Call Scheduled": 1,
  "Rejected": null,
  "Closed Won": null,
  "Closed Lost": null,
};

export function calculateNextFollowUpDate(
  status: LeadStatus,
  callScheduledDate?: Date | string | null,
): Date | null {
  const days = FOLLOWUP_CADENCE[status];
  if (days === null) return null;

  if (status === "Call Scheduled" && callScheduledDate) {
    const callDate = new Date(callScheduledDate);
    callDate.setDate(callDate.getDate() + days);
    return callDate;
  }

  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
