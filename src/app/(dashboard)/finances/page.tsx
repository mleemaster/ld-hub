/*
 * Finances page.
 * Revenue (MRR, plan breakdown, setup fees), Expenses,
 * Profit, Churn, and Growth metrics — all from real data.
 * Includes Recharts trend/donut charts and full CRUD expense table.
 *
 * Time period selector supports standard presets (Last 7 Days, Last 30 Days,
 * This Month, YTD, Last 12 Months) plus a Custom Range with inline DatePickers.
 * API receives start/end dates; trend granularity is auto-determined server-side.
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import TimePeriodToggle from "@/components/finances/TimePeriodToggle";
import TrendLineChart from "@/components/finances/TrendLineChart";
import PlanBreakdownChart from "@/components/finances/PlanBreakdownChart";
import ExpenseTable from "@/components/finances/ExpenseTable";
import ExpenseForm from "@/components/finances/ExpenseForm";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { EXPENSE_CATEGORIES } from "@/lib/expense-constants";
import type { FinancesSummary, Expense, ExpenseFormData, TimePeriod } from "@/lib/finance-types";

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDelta(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getDateRange(
  period: TimePeriod,
  customStart: string,
  customEnd: string
): { start: string; end: string } {
  const today = new Date();
  const todayStr = toYMD(today);

  switch (period) {
    case "last7": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: toYMD(start), end: todayStr };
    }
    case "last30": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start: toYMD(start), end: todayStr };
    }
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toYMD(start), end: todayStr };
    }
    case "ytd": {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start: toYMD(start), end: todayStr };
    }
    case "last12Months": {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 12);
      start.setDate(start.getDate() + 1);
      return { start: toYMD(start), end: todayStr };
    }
    case "custom":
      return { start: customStart, end: customEnd };
  }
}

const PERIOD_LABELS: Record<TimePeriod, { label: string; comparison: string }> = {
  last7: { label: "Last 7 days", comparison: "vs previous 7 days" },
  last30: { label: "Last 30 days", comparison: "vs previous 30 days" },
  thisMonth: { label: "This month", comparison: "vs previous month" },
  ytd: { label: "Year to date", comparison: "vs previous year" },
  last12Months: { label: "Last 12 months", comparison: "vs previous 12 months" },
  custom: { label: "Selected period", comparison: "vs previous period" },
};

const categoryFilterOptions = [
  { value: "", label: "All Categories" },
  ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export default function FinancesPage() {
  const [period, setPeriod] = useState<TimePeriod>("thisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [summary, setSummary] = useState<FinancesSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const fetchSummary = useCallback(async () => {
    const range = getDateRange(period, customStart, customEnd);
    if (!range.start || !range.end) return;
    try {
      const res = await fetch(`/api/finances/summary?start=${range.start}&end=${range.end}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // Silent fail
    }
  }, [period, customStart, customEnd]);

  const fetchExpenses = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/expenses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch {
      // Silent fail
    }
  }, [categoryFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchExpenses()]).finally(() =>
      setLoading(false)
    );
  }, [fetchSummary, fetchExpenses]);

  async function handleAddExpense(formData: ExpenseFormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          amount: parseFloat(formData.amount),
          type: formData.type,
          category: formData.category,
          date: formData.date,
          autoTracked: false,
        }),
      });
      if (res.ok) {
        setShowExpenseModal(false);
        await Promise.all([fetchSummary(), fetchExpenses()]);
      }
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateExpense(formData: ExpenseFormData) {
    if (!editingExpense) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${editingExpense._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          amount: parseFloat(formData.amount),
          type: formData.type,
          category: formData.category,
          date: formData.date,
        }),
      });
      if (res.ok) {
        setEditingExpense(null);
        await Promise.all([fetchSummary(), fetchExpenses()]);
      }
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteExpense() {
    if (!editingExpense) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${editingExpense._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEditingExpense(null);
        await Promise.all([fetchSummary(), fetchExpenses()]);
      }
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  }

  const mrrDelta = summary ? summary.mrr - summary.previousMrr : 0;
  const { label: periodLabel, comparison: periodComparison } = PERIOD_LABELS[period];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-primary">Finances</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface-secondary p-6 animate-pulse"
            >
              <div className="h-3 w-16 bg-surface-tertiary rounded mb-3" />
              <div className="h-8 w-24 bg-surface-tertiary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Finances</h1>
        <TimePeriodToggle
          period={period}
          onPeriodChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">MRR</h3>
          <p className="text-3xl font-semibold text-text-primary">
            {formatCurrency(summary?.mrr ?? 0)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {mrrDelta !== 0 && (
              <Badge variant={mrrDelta > 0 ? "success" : "danger"}>
                {formatDelta(mrrDelta)}
              </Badge>
            )}
            <span className="text-xs text-text-tertiary">{periodComparison}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Total Revenue
          </h3>
          <p className="text-3xl font-semibold text-text-primary">
            {formatCurrency(summary?.totalRevenue ?? 0)}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {periodLabel} &middot; MRR + ${summary?.setupFees ?? 0} setup fees
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Expenses
          </h3>
          <p className="text-3xl font-semibold text-text-primary">
            {formatCurrency(summary?.totalExpenses ?? 0)}
          </p>
          <p className="text-xs text-text-tertiary mt-1">{periodLabel}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Profit
          </h3>
          <p
            className={`text-3xl font-semibold ${
              (summary?.profit ?? 0) >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {formatCurrency(summary?.profit ?? 0)}
          </p>
          <p className="text-xs text-text-tertiary mt-1">Revenue &minus; Expenses</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">
            MRR Trend
          </h3>
          <TrendLineChart
            data={(summary?.trends ?? []).map((t) => ({
              label: t.label,
              value: t.mrr,
            }))}
            color="#3b82f6"
            label="MRR"
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">
            Plan Breakdown
          </h3>
          <PlanBreakdownChart data={summary?.planBreakdown ?? []} />
        </div>
      </div>

      {/* Churn & Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Churn</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Churn rate</span>
              <span className="text-sm font-medium text-text-primary">
                {(summary?.churnRate ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Lost {periodLabel.toLowerCase()}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {summary?.churnCount ?? 0}
              </span>
            </div>
            {(summary?.churnedClients ?? []).length > 0 && (
              <div className="pt-2 border-t border-border-secondary">
                <p className="text-xs text-text-tertiary mb-2">
                  Recently canceled
                </p>
                <div className="space-y-1.5">
                  {summary!.churnedClients.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-text-secondary">{c.businessName}</span>
                      <span className="text-text-tertiary">
                        {new Date(c.canceledAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Growth</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                New clients {periodLabel.toLowerCase()}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {summary?.newClients ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Net growth</span>
              <span
                className={`text-sm font-medium ${
                  (summary?.netGrowth ?? 0) >= 0
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {(summary?.netGrowth ?? 0) >= 0 ? "+" : ""}
                {summary?.netGrowth ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">MRR growth</span>
              <span
                className={`text-sm font-medium ${
                  (summary?.mrrDelta ?? 0) >= 0
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {formatDelta(summary?.mrrDelta ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses section */}
      <div className="rounded-2xl border border-border bg-surface-secondary p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Expenses</h3>
          <div className="flex items-center gap-3">
            <Select
              options={categoryFilterOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="All Categories"
              className="w-44"
            />
            <Button size="sm" onClick={() => setShowExpenseModal(true)}>
              Add Expense
            </Button>
          </div>
        </div>

        <ExpenseTable
          expenses={expenses}
          onEdit={(expense) => setEditingExpense(expense)}
        />
      </div>

      {/* Add expense modal */}
      <ExpenseForm
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleAddExpense}
        submitting={submitting}
      />

      {/* Edit expense modal */}
      <ExpenseForm
        open={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSubmit={handleUpdateExpense}
        onDelete={handleDeleteExpense}
        initialData={editingExpense}
        submitting={submitting}
      />
    </div>
  );
}
