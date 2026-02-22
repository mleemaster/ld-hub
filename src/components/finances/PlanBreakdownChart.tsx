/*
 * Donut chart showing revenue share per plan tier.
 * Uses Recharts PieChart with innerRadius for the donut shape.
 */
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { PlanBreakdown } from "@/lib/finance-types";

interface PlanBreakdownChartProps {
  data: PlanBreakdown[];
}

const TIER_COLORS: Record<string, string> = {
  "Landing Page": "#3b82f6",
  "Multi-Page": "#8b5cf6",
  eCommerce: "#f59e0b",
  PPC: "#10b981",
};

function getColor(tier: string): string {
  return TIER_COLORS[tier] || "#6b7280";
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

export default function PlanBreakdownChart({ data }: PlanBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-tertiary text-sm">
        No active plans
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="w-[180px] h-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="tier"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.tier} fill={getColor(entry.tier)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                fontSize: "13px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 min-w-0 flex-1">
        {data.map((entry) => (
          <div key={entry.tier} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getColor(entry.tier) }}
            />
            <span className="text-sm text-text-secondary truncate flex-1">
              {entry.tier}
            </span>
            <span className="text-sm font-medium text-text-primary whitespace-nowrap">
              {entry.count} &middot; {formatCurrency(entry.revenue)}/mo
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
