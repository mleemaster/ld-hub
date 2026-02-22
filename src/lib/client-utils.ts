/*
 * Client utilities: status-to-badge mapping, Select option arrays,
 * and client-side search for the clients page.
 */
import type { BadgeVariant } from "@/components/ui/Badge";
import { PLAN_TIERS, PROJECT_STATUSES } from "@/lib/client-constants";
import type { ProjectStatus } from "@/lib/client-constants";

const STATUS_BADGE_MAP: Record<ProjectStatus, BadgeVariant> = {
  "Awaiting Design": "neutral",
  "Awaiting Revision": "warning",
  "Awaiting Final Dev": "info",
  "Deployed Active": "success",
  "Deployed Canceled": "danger",
};

export function getProjectStatusBadgeVariant(status: string): BadgeVariant {
  return STATUS_BADGE_MAP[status as ProjectStatus] ?? "default";
}

function toOptions(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

export const PLAN_TIER_OPTIONS = toOptions(PLAN_TIERS);
export const PROJECT_STATUS_OPTIONS = toOptions(PROJECT_STATUSES);

export const PLAN_TIER_FILTER_OPTIONS = [{ value: "", label: "All Plans" }, ...PLAN_TIER_OPTIONS];
export const PROJECT_STATUS_FILTER_OPTIONS = [{ value: "", label: "All Statuses" }, ...PROJECT_STATUS_OPTIONS];
export const PPC_FILTER_OPTIONS = [
  { value: "", label: "PPC: All" },
  { value: "true", label: "PPC Clients" },
  { value: "false", label: "Non-PPC" },
];

interface SearchableClient {
  name?: string;
  businessName?: string;
  phone?: string;
  email?: string;
}

export function searchClients<T extends SearchableClient>(clients: T[], query: string): T[] {
  if (!query.trim()) return clients;
  const q = query.toLowerCase();
  return clients.filter((client) =>
    [client.name, client.businessName, client.phone, client.email]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(q))
  );
}
