/*
 * Outreach trend chart with inline period selector.
 * Shows daily leads contacted and follow-ups as stacked area lines.
 * Period selector lives in the card header to keep it subtle.
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { nowET, toYMD } from "@/lib/date-utils";

type Period = "last7" | "last14" | "last30" | "thisMonth" | "last3Months";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "last7", label: "7D" },
  { value: "last14", label: "14D" },
  { value: "last30", label: "30D" },
  { value: "thisMonth", label: "MTD" },
  { value: "last3Months", label: "3M" },
];

function getDateRange(period: Period): { start: string; end: string } {
  const today = nowET();
  const todayStr = toYMD(today);

  switch (period) {
    case "last7": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: toYMD(s), end: todayStr };
    }
    case "last14": {
      const s = new Date(today);
      s.setDate(s.getDate() - 13);
      return { start: toYMD(s), end: todayStr };
    }
    case "last30": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: toYMD(s), end: todayStr };
    }
    case "thisMonth": {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toYMD(s), end: todayStr };
    }
    case "last3Months": {
      const s = new Date(today);
      s.setMonth(s.getMonth() - 3);
      s.setDate(s.getDate() + 1);
      return { start: toYMD(s), end: todayStr };
    }
  }
}

interface TrendPoint {
  date: string;
  leadsContacted: number;
  followUps: number;
}

const AXIS_COLOR = "#9ca3af";
const GRID_COLOR = "#e5e7eb33";

function formatLabel(dateStr: string, period: Period): string {
  const d = new Date(dateStr + "T12:00:00");
  if (period === "last3Months") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function OutreachTrendChart() {
  const [period, setPeriod] = useState<Period>("last30");
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef<string | null>(null);

  const fetchTrends = useCallback(async (p: Period) => {
    const key = p;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    setLoading(true);
    try {
      const { start, end } = getDateRange(p);
      const res = await fetch(`/api/openclaw/outreach-trends?start=${start}&end=${end}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.trends ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends(period);
  }, [period, fetchTrends]);

  const chartData = data.map((d) => ({
    label: formatLabel(d.date, period),
    leadsContacted: d.leadsContacted,
    followUps: d.followUps,
  }));

  const tickInterval = period === "last3Months" ? 6 : period === "last30" ? 4 : period === "last14" ? 1 : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Outreach Trend</h3>
        <div className="flex items-center gap-0.5 rounded-lg bg-surface border border-border p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                fetchedRef.current = null;
                setPeriod(opt.value);
              }}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                period === opt.value
                  ? "bg-accent/10 text-accent"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[200px] text-text-tertiary text-sm">
          Loading...
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-text-tertiary text-sm">
          No outreach data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-contacted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-followups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                fontSize: "13px",
              }}
              labelStyle={{ color: AXIS_COLOR }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
            <Area
              type="monotone"
              dataKey="leadsContacted"
              name="Leads Contacted"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#grad-contacted)"
            />
            <Area
              type="monotone"
              dataKey="followUps"
              name="Follow Ups"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#grad-followups)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
