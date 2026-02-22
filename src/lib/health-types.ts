/*
 * Client-safe types for the Site Health feature.
 * Used by the health API routes and the Site Health dashboard page.
 */

export type HealthStatus = "healthy" | "degraded" | "down";
export type CheckType = "uptime" | "ssl" | "contact_form";
export type IncidentType = "down" | "degraded" | "ssl_expiring" | "ssl_expired" | "contact_form_broken";

export interface HealthCheck {
  checkType: CheckType;
  status: HealthStatus;
  responseTimeMs?: number;
  statusCode?: number;
  sslDaysRemaining?: number;
  sslExpiry?: string;
  errorMessage?: string;
  checkedAt: string;
}

export interface HealthIncident {
  _id: string;
  clientId: string;
  businessName?: string;
  websiteUrl?: string;
  type: IncidentType;
  description: string;
  startedAt: string;
  resolvedAt?: string;
  alertCount: number;
}

export interface SiteHealth {
  clientId: string;
  businessName: string;
  websiteUrl: string;
  currentHealthStatus: HealthStatus;
  lastHealthCheck?: string;
  checks: HealthCheck[];
  incidents: HealthIncident[];
}

export interface HealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  down: number;
}

export interface HealthStatusResponse {
  summary: HealthSummary;
  sites: SiteHealth[];
}

export interface IncidentHistoryResponse {
  incidents: HealthIncident[];
}
