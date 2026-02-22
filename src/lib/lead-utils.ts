/*
 * Lead utilities: status-to-badge mapping, Select option arrays,
 * attention detection, and client-side search.
 */
import type { BadgeVariant } from "@/components/ui/Badge";
import { LEAD_STATUSES, LEAD_SOURCES, INDUSTRIES, PIPELINE_STATUSES, US_STATES, STATE_NAME_TO_ABBR } from "@/lib/lead-constants";
import type { LeadStatus } from "@/lib/lead-constants";
import { parseLocalDate } from "@/lib/utils";

const STATUS_BADGE_MAP: Record<LeadStatus, BadgeVariant> = {
  New: "default",
  "No Response": "neutral",
  Rejected: "danger",
  Cold: "info",
  Warm: "warning",
  "Call Scheduled": "info",
  "Closed Won": "success",
  "Closed Lost": "danger",
};

export function getStatusBadgeVariant(status: LeadStatus): BadgeVariant {
  return STATUS_BADGE_MAP[status] ?? "default";
}

function toOptions(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

export const STATUS_OPTIONS = toOptions(LEAD_STATUSES);
export const SOURCE_OPTIONS = toOptions(LEAD_SOURCES);
export const INDUSTRY_OPTIONS = toOptions(INDUSTRIES);
export const STATE_OPTIONS = toOptions(US_STATES);

export const STATUS_FILTER_OPTIONS = [{ value: "", label: "All Statuses" }, ...STATUS_OPTIONS];
export const PIPELINE_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...toOptions(PIPELINE_STATUSES),
];
export const SOURCE_FILTER_OPTIONS = [{ value: "", label: "All Sources" }, ...SOURCE_OPTIONS];
export const INDUSTRY_FILTER_OPTIONS = [{ value: "", label: "All Industries" }, ...INDUSTRY_OPTIONS];
export const STATE_FILTER_OPTIONS = [{ value: "", label: "All States" }, ...STATE_OPTIONS];

interface LeadLike {
  followUpDate?: string | Date | null;
  callScheduledDate?: string | Date | null;
  status?: string;
}

export function isNeedingAttention(lead: LeadLike): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lead.followUpDate) {
    const followUp = parseLocalDate(lead.followUpDate);
    if (followUp) {
      followUp.setHours(0, 0, 0, 0);
      if (followUp <= today) return true;
    }
  }

  if (lead.status === "Call Scheduled" && lead.callScheduledDate) {
    const callDate = parseLocalDate(lead.callScheduledDate);
    if (callDate) {
      callDate.setHours(0, 0, 0, 0);
      if (callDate <= today) return true;
    }
  }

  return false;
}

interface SearchableLead {
  name?: string;
  businessName?: string;
  phone?: string;
  email?: string;
}

const VALID_ABBRS = new Set<string>(US_STATES);

export function normalizeState(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  if (VALID_ABBRS.has(upper)) return upper;
  return STATE_NAME_TO_ABBR[trimmed.toLowerCase()] ?? trimmed;
}

export function searchLeads<T extends SearchableLead>(leads: T[], query: string): T[] {
  if (!query.trim()) return leads;
  const q = query.toLowerCase();
  return leads.filter((lead) =>
    [lead.name, lead.businessName, lead.phone, lead.email]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(q))
  );
}
