/*
 * Outreach page — daily outreach stats, trend chart, message templates, and activity feed.
 * Fetches summary data from /api/openclaw/summary for the Outreach Today card.
 */
"use client";

import { useState, useEffect } from "react";
import ActivityFeed from "@/components/openclaw/ActivityFeed";
import TemplateManager from "@/components/openclaw/TemplateManager";
import OutreachTrendChart from "@/components/openclaw/OutreachTrendChart";
import OutreachStats from "@/components/openclaw/OutreachStats";

interface OutreachSummary {
  leadsContactedToday: number;
  followUpsToday: number;
}

export default function OutreachPage() {
  const [summary, setSummary] = useState<OutreachSummary>({
    leadsContactedToday: 0,
    followUpsToday: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/openclaw/summary")
      .then((r) => r.json())
      .then((data) => {
        setSummary({
          leadsContactedToday: data.leadsContactedToday ?? 0,
          followUpsToday: data.followUpsToday ?? 0,
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
          <div className="grid grid-cols-2 gap-3">
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

      <OutreachStats />

      <TemplateManager />

      <ActivityFeed />
    </div>
  );
}
