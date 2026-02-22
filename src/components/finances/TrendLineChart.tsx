/*
 * Reusable Recharts AreaChart for MRR and Profit trend lines.
 * Uses hardcoded neutral colors for chart axes/grid since
 * Recharts doesn't support CSS variables in SVG attributes.
 */
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendLineChartProps {
  data: { label: string; value: number }[];
  color: string;
  label: string;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

const AXIS_COLOR = "#9ca3af";
const GRID_COLOR = "#e5e7eb33";

export default function TrendLineChart({ data, color, label }: TrendLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-tertiary text-sm">
        No trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip
          formatter={(value: number | undefined) => [formatCurrency(value ?? 0), label]}
          contentStyle={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            fontSize: "13px",
          }}
          labelStyle={{ color: AXIS_COLOR }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${label})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
