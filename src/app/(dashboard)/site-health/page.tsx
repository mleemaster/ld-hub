/*
 * Site Health dashboard page.
 * Displays monitoring summary, alert cards for problem sites,
 * a health table for all monitored clients, and incident history.
 * Follows the same useEffect + fetch pattern as the Leads/Clients pages.
 */
"use client";

import { useState, useEffect, useMemo } from "react";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import type {
  HealthStatusResponse,
  HealthIncident,
  SiteHealth,
  HealthCheck,
} from "@/lib/health-types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function durationSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function getCheck(site: SiteHealth, type: string): HealthCheck | undefined {
  return site.checks.find((c) => c.checkType === type);
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "healthy" ? "success" : status === "degraded" ? "warning" : "danger";
  return <Badge variant={variant}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

export default function SiteHealthPage() {
  const [data, setData] = useState<HealthStatusResponse | null>(null);
  const [incidents, setIncidents] = useState<HealthIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/health/status").then((r) => r.json()),
      fetch("/api/health/history?limit=50&status=all").then((r) => r.json()),
    ])
      .then(([statusData, historyData]) => {
        setData(statusData);
        setIncidents(historyData.incidents || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredSites = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.sites;
    const q = search.toLowerCase();
    return data.sites.filter((s) => s.businessName.toLowerCase().includes(q));
  }, [data, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || { total: 0, healthy: 0, degraded: 0, down: 0 };
  const problemSites = data?.sites.filter((s) => s.currentHealthStatus !== "healthy") || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Site Health</h1>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-secondary border border-border">
          <span className="text-sm text-text-secondary">Total</span>
          <span className="text-sm font-semibold text-text-primary">{summary.total}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-sm text-success">Healthy</span>
          <span className="text-sm font-semibold text-success">{summary.healthy}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/20">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-sm text-warning">Degraded</span>
          <span className="text-sm font-semibold text-warning">{summary.degraded}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-danger/10 border border-danger/20">
          <div className="w-2 h-2 rounded-full bg-danger" />
          <span className="text-sm text-danger">Down</span>
          <span className="text-sm font-semibold text-danger">{summary.down}</span>
        </div>
      </div>

      {/* Alert cards */}
      {problemSites.length > 0 && (
        <div className="space-y-3">
          {problemSites.map((site) => {
            const isDown = site.currentHealthStatus === "down";
            const incident = site.incidents[0];
            return (
              <div
                key={site.clientId}
                className={`rounded-2xl border p-4 ${
                  isDown
                    ? "border-danger/30 bg-danger/5"
                    : "border-warning/30 bg-warning/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${isDown ? "bg-danger" : "bg-warning"}`} />
                      <span className="font-medium text-text-primary">{site.businessName}</span>
                      <StatusBadge status={site.currentHealthStatus} />
                    </div>
                    <a
                      href={site.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-text-tertiary hover:text-accent transition-colors"
                    >
                      {site.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                    {incident && (
                      <p className="text-sm text-text-secondary mt-1">{incident.description}</p>
                    )}
                  </div>
                  {incident && (
                    <span className="text-xs text-text-tertiary whitespace-nowrap">
                      {durationSince(incident.startedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search + Health table */}
      <div className="space-y-3">
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="rounded-2xl border border-border bg-surface-secondary overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>SSL Expiry</TableHead>
                <TableHead>Contact Form</TableHead>
                <TableHead>Last Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-text-tertiary py-8">
                    {search ? "No matching sites" : "No monitored sites yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSites.map((site) => {
                  const uptime = getCheck(site, "uptime");
                  const ssl = getCheck(site, "ssl");
                  const contact = getCheck(site, "contact_form");

                  return (
                    <TableRow key={site.clientId}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{site.businessName}</span>
                          <a
                            href={site.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-text-tertiary hover:text-accent truncate max-w-48"
                          >
                            {site.websiteUrl.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={site.currentHealthStatus} />
                      </TableCell>
                      <TableCell>
                        {uptime ? <StatusBadge status={uptime.status} /> : <span className="text-text-tertiary">—</span>}
                      </TableCell>
                      <TableCell>
                        {uptime?.responseTimeMs != null ? (
                          <span className={uptime.responseTimeMs > 5000 ? "text-warning" : "text-text-primary"}>
                            {uptime.responseTimeMs}ms
                          </span>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ssl?.sslDaysRemaining != null ? (
                          <span
                            className={
                              ssl.sslDaysRemaining <= 0
                                ? "text-danger"
                                : ssl.sslDaysRemaining <= 14
                                  ? "text-warning"
                                  : "text-text-primary"
                            }
                          >
                            {ssl.sslDaysRemaining}d
                          </span>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact ? <StatusBadge status={contact.status} /> : <span className="text-text-tertiary">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="text-text-tertiary text-xs">
                          {site.lastHealthCheck ? timeAgo(site.lastHealthCheck) : "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Incident history */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Incident History</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-text-tertiary">No incidents recorded</p>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => (
              <div
                key={inc._id}
                className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-secondary px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm text-text-primary truncate">
                      {inc.businessName || "Unknown"}
                    </span>
                    <Badge
                      variant={inc.resolvedAt ? "success" : "danger"}
                    >
                      {inc.resolvedAt ? "Resolved" : "Open"}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary">{inc.description}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {inc.type.replace(/_/g, " ")} — started {timeAgo(inc.startedAt)}
                    {inc.resolvedAt && ` — resolved ${timeAgo(inc.resolvedAt)}`}
                  </p>
                </div>
                <span className="text-xs text-text-tertiary whitespace-nowrap">
                  {inc.resolvedAt
                    ? durationSince(inc.startedAt)
                    : `${durationSince(inc.startedAt)} ongoing`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
