/*
 * Comprehensive outreach response statistics in a single unified card.
 * Top section: funnel stats + status distribution bar.
 * Bottom section: tabbed response rate breakdown by template, source, state, industry, day of week.
 * Supports merging duplicate categories (source, state, industry) via hover action + modal.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";

interface BreakdownRow {
  label: string;
  sent: number;
  responded: number;
  positive: number;
  rate: number;
}

interface Overview {
  totalSent: number;
  totalResponded: number;
  totalPositive: number;
  totalClosedWon: number;
  responseRate: number;
  positiveRate: number;
  closeRate: number;
}

interface StatsData {
  overview: Overview;
  statusCounts: Record<string, number>;
  byState: BreakdownRow[];
  bySource: BreakdownRow[];
  byTemplate: BreakdownRow[];
  byIndustry: BreakdownRow[];
  byDayOfWeek: BreakdownRow[];
}

type BreakdownKey = "byTemplate" | "bySource" | "byState" | "byIndustry" | "byDayOfWeek";

const TABS: { key: BreakdownKey; label: string }[] = [
  { key: "byTemplate", label: "Template" },
  { key: "bySource", label: "Source" },
  { key: "byState", label: "State" },
  { key: "byIndustry", label: "Industry" },
  { key: "byDayOfWeek", label: "Day" },
];

const MERGEABLE_TABS = new Set<BreakdownKey>(["bySource", "byState", "byIndustry"]);

const TAB_TO_FIELD: Partial<Record<BreakdownKey, string>> = {
  bySource: "source",
  byState: "state",
  byIndustry: "industry",
};

const STATUS_COLORS: Record<string, string> = {
  "No Response": "bg-text-tertiary/60",
  "Rejected": "bg-danger/80",
  "Cold": "bg-accent/70",
  "Warm": "bg-warning/80",
  "Call Scheduled": "bg-accent",
  "Closed Won": "bg-success",
  "Closed Lost": "bg-danger/50",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  "No Response": "bg-text-tertiary",
  "Rejected": "bg-danger",
  "Cold": "bg-accent/70",
  "Warm": "bg-warning",
  "Call Scheduled": "bg-accent",
  "Closed Won": "bg-success",
  "Closed Lost": "bg-danger/60",
};

const STATUS_ORDER = ["No Response", "Cold", "Warm", "Call Scheduled", "Rejected", "Closed Won", "Closed Lost"];

function fmt(n: number): string {
  return n % 1 === 0 ? `${n}` : n.toFixed(1);
}

function MergeModal({
  field,
  fromLabel,
  fromCount,
  options,
  onClose,
  onMerged,
}: {
  field: string;
  fromLabel: string;
  fromCount: number;
  options: string[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const [targetValue, setTargetValue] = useState("");
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMerge() {
    if (!targetValue) return;
    setMerging(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, fromValue: fromLabel, toValue: targetValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Merge failed");
      }
      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
      setMerging(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Merge Category">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Merge <span className="font-medium text-text-primary">&ldquo;{fromLabel}&rdquo;</span> into:
        </p>

        <Select
          options={options.map((o) => ({ value: o, label: o }))}
          value={targetValue}
          onChange={setTargetValue}
          placeholder="Select target category..."
        />

        <p className="text-xs text-text-tertiary">
          This will update {fromCount} lead{fromCount !== 1 ? "s" : ""}.
        </p>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMerge}
            disabled={!targetValue || merging}
            className="px-3 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {merging ? "Merging..." : "Merge"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function OutreachStats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BreakdownKey>("byTemplate");
  const [mergeRow, setMergeRow] = useState<BreakdownRow | null>(null);

  const refreshStats = useCallback(() => {
    setLoading(true);
    fetch("/api/openclaw/outreach-stats")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-secondary p-6">
        <p className="text-sm text-text-tertiary text-center py-8">Loading statistics...</p>
      </div>
    );
  }

  if (!data) return null;

  const { overview, statusCounts } = data;
  const rows = data[activeTab];
  const orderedStatuses = STATUS_ORDER.filter((s) => statusCounts[s]);
  const isMergeable = MERGEABLE_TABS.has(activeTab) && rows.length >= 2;

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary">
      {/* Funnel header */}
      <div className="p-6 pb-5">
        <h3 className="text-sm font-medium text-text-secondary mb-5">Response Statistics</h3>

        {/* Metric pills */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Contacted", value: overview.totalSent, rate: null },
            { label: "Responded", value: overview.totalResponded, rate: overview.responseRate },
            { label: "Positive", value: overview.totalPositive, rate: overview.positiveRate },
            { label: "Closed", value: overview.totalClosedWon, rate: overview.closeRate },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-surface border border-border px-3 py-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-semibold text-text-primary tabular-nums">{m.value}</span>
                {m.rate !== null && (
                  <span className="text-xs text-text-tertiary tabular-nums">{fmt(m.rate)}%</span>
                )}
              </div>
              <p className="text-[11px] text-text-tertiary mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Status distribution */}
        <div className="flex rounded-lg overflow-hidden h-2 mb-2">
          {orderedStatuses.map((status) => {
            const count = statusCounts[status] || 0;
            const pct = overview.totalSent > 0 ? (count / overview.totalSent) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={status}
                className={cn("h-full transition-all", STATUS_COLORS[status])}
                style={{ width: `${pct}%` }}
                title={`${status}: ${count} (${fmt(pct)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1">
          {orderedStatuses.map((status) => {
            const count = statusCounts[status] || 0;
            const pct = overview.totalSent > 0 ? (count / overview.totalSent) * 100 : 0;
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT_COLORS[status])} />
                <span className="text-[11px] text-text-tertiary tabular-nums">
                  {status} {count} ({fmt(pct)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Breakdown section */}
      <div className="p-6 pt-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Breakdown</h3>
          <div className="flex items-center gap-0.5 rounded-lg bg-surface border border-border p-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  activeTab === tab.key
                    ? "bg-accent/10 text-accent"
                    : "text-text-tertiary hover:text-text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-6">No data for this breakdown</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div key={row.label} className="group flex items-center gap-3 py-1.5">
                <span className="text-sm text-text-primary font-medium w-36 truncate shrink-0" title={row.label}>
                  {row.label}
                </span>

                {isMergeable && (
                  <button
                    type="button"
                    onClick={() => setMergeRow(row)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-surface-tertiary text-text-tertiary hover:text-text-primary cursor-pointer"
                    title={`Merge "${row.label}" into another category`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </button>
                )}

                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-tertiary/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.min(row.rate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-text-tertiary tabular-nums w-12 text-right">{row.sent} sent</span>
                  <span className="text-[11px] text-text-secondary tabular-nums w-16 text-right">{row.responded} replied</span>
                  <span className="text-sm font-medium text-text-primary tabular-nums w-12 text-right">
                    {fmt(row.rate)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {mergeRow && (
        <MergeModal
          field={TAB_TO_FIELD[activeTab]!}
          fromLabel={mergeRow.label}
          fromCount={mergeRow.sent}
          options={rows.filter((r) => r.label !== mergeRow.label).map((r) => r.label)}
          onClose={() => setMergeRow(null)}
          onMerged={() => {
            setMergeRow(null);
            refreshStats();
          }}
        />
      )}
    </div>
  );
}
