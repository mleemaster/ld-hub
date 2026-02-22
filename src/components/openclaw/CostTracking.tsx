/*
 * Cost tracking display for OpenClaw.
 * Fetches aggregated cost data from the summary endpoint.
 */
"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface Summary {
  costPerLead: number;
  costPerMessage: number;
  costThisWeek: number;
  costThisMonth: number;
}

export default function CostTracking() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/openclaw/summary");
        const data = await res.json();
        setSummary(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  const stats = [
    {
      label: "Cost per Lead",
      value:
        summary && summary.costPerLead > 0
          ? formatCurrency(summary.costPerLead)
          : "--",
    },
    {
      label: "Cost per Message",
      value:
        summary && summary.costPerMessage > 0
          ? formatCurrency(summary.costPerMessage)
          : "--",
    },
    {
      label: "This Week",
      value: summary ? formatCurrency(summary.costThisWeek) : "$0.00",
    },
    {
      label: "This Month",
      value: summary ? formatCurrency(summary.costThisMonth) : "$0.00",
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-4">
        Cost Tracking
      </h3>
      {loading ? (
        <p className="text-sm text-text-tertiary">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-xs text-text-tertiary">{stat.label}</p>
              <p className="text-lg font-semibold text-text-primary mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
