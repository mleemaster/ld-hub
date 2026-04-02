/*
 * Outreach page — daily outreach stats, trend chart, source performance,
 * message templates, and activity feed.
 */
"use client";

import { useState, useEffect } from "react";
import ActivityFeed from "@/components/outreach/ActivityFeed";
import TemplateManager from "@/components/outreach/TemplateManager";
import OutreachTrendChart from "@/components/outreach/OutreachTrendChart";
import OutreachStats from "@/components/outreach/OutreachStats";

interface OutreachSummary {
  leadsContactedToday: number;
  followUpsToday: number;
  leadsAddedToday: number;
}

interface SourceStat {
  source: string;
  total: number;
  contacted: number;
  replied: number;
  conversionRate: string;
}

function SourcePerformance() {
  const [data, setData] = useState<SourceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads/source-performance")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-secondary p-6">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Source Performance</h3>
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-4">Source Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">Source</th>
              <th className="pb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider text-right">Leads</th>
              <th className="pb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider text-right">Contacted</th>
              <th className="pb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider text-right">Replied</th>
              <th className="pb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider text-right">Conv. Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.source} className="border-b border-border-secondary">
                <td className="py-2 text-text-primary font-medium">{row.source}</td>
                <td className="py-2 text-text-secondary text-right">{row.total}</td>
                <td className="py-2 text-text-secondary text-right">{row.contacted}</td>
                <td className="py-2 text-text-secondary text-right">{row.replied}</td>
                <td className="py-2 text-text-secondary text-right">{row.conversionRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OutreachPage() {
  const [summary, setSummary] = useState<OutreachSummary>({
    leadsContactedToday: 0,
    followUpsToday: 0,
    leadsAddedToday: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/openclaw/summary")
      .then((r) => r.json())
      .then((data) => {
        setSummary({
          leadsContactedToday: data.leadsContactedToday ?? 0,
          followUpsToday: data.followUpsToday ?? 0,
          leadsAddedToday: data.leadsAddedToday ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Outreach</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Outreach Today
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-3xl font-semibold text-text-primary">
                {loaded ? summary.leadsAddedToday : "--"}
              </p>
              <p className="text-xs text-text-tertiary mt-1">Leads Added</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-text-primary">
                {loaded ? summary.leadsContactedToday : "--"}
              </p>
              <p className="text-xs text-text-tertiary mt-1">Leads Contacted</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-text-primary">
                {loaded ? summary.followUpsToday : "--"}
              </p>
              <p className="text-xs text-text-tertiary mt-1">Follow Ups</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <OutreachTrendChart />
        </div>
      </div>

      <SourcePerformance />

      <OutreachStats />

      <TemplateManager />

      <ActivityFeed />
    </div>
  );
}
