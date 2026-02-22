/*
 * Finance summary aggregation API.
 * Single GET endpoint that computes MRR, revenue, expenses, profit,
 * churn, growth, and trend data from Client and Expense collections.
 *
 * Accepts ?start=YYYY-MM-DD&end=YYYY-MM-DD for arbitrary date ranges.
 * Falls back to ?period=monthly|weekly for backward compatibility.
 *
 * Trend granularity auto-determined: <=45 days -> weekly, >45 days -> monthly.
 * Previous period is the same-length window shifted backward from start.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Expense } from "@/models/Expense";
import type { IClient } from "@/models/Client";
import type {
  FinancesSummary,
  PlanBreakdown,
  TrendPoint,
  ExpenseCategoryBreakdown,
} from "@/lib/finance-types";

function isActiveClient(client: IClient): boolean {
  return client.projectStatus !== "Deployed Canceled";
}

function getClientMrr(client: IClient): number {
  let mrr = 0;
  if (isActiveClient(client) && client.monthlyRevenue) {
    mrr += client.monthlyRevenue;
  }
  if (client.ppcClient && client.ppcManagementFee) {
    mrr += client.ppcManagementFee;
  }
  return mrr;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toEndOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function toStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function formatLabel(d: Date, granularity: "weekly" | "monthly"): string {
  if (granularity === "monthly") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const legacyPeriod = searchParams.get("period") as "monthly" | "weekly" | null;

    let rangeStart: Date;
    let rangeEnd: Date;

    if (startParam && endParam) {
      rangeStart = toStartOfDay(parseDate(startParam));
      rangeEnd = toEndOfDay(parseDate(endParam));
    } else if (legacyPeriod) {
      const refDate = new Date();
      const r = legacyPeriod === "monthly" ? getMonthRange(refDate) : getWeekRange(refDate);
      rangeStart = r.start;
      rangeEnd = r.end;
    } else {
      const refDate = new Date();
      const r = getMonthRange(refDate);
      rangeStart = r.start;
      rangeEnd = r.end;
    }

    const rangeDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const prevEnd = new Date(rangeStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - rangeDays + 1);
    prevStart.setHours(0, 0, 0, 0);

    const allClients = await Client.find({}).lean<IClient[]>();
    const allExpenses = await Expense.find({}).lean();

    // MRR from currently active clients
    const currentlyActive = allClients.filter(isActiveClient);
    const mrr = currentlyActive.reduce((sum, c) => sum + getClientMrr(c), 0);

    // Previous period MRR
    const prevActive = allClients.filter((c) => {
      const started = c.startDate ? new Date(c.startDate) <= prevEnd : true;
      const notCanceledYet =
        isActiveClient(c) ||
        (c.canceledAt && new Date(c.canceledAt) > prevEnd);
      return started && notCanceledYet;
    });
    const previousMrr = prevActive.reduce((sum, c) => sum + getClientMrr(c), 0);

    // Plan breakdown
    const planMap = new Map<string, PlanBreakdown>();
    for (const client of currentlyActive) {
      const tier = client.planTier;
      const existing = planMap.get(tier) || { tier, count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += client.monthlyRevenue || 0;
      planMap.set(tier, existing);

      if (client.ppcClient && client.ppcManagementFee) {
        const ppc = planMap.get("PPC") || {
          tier: "PPC",
          count: 0,
          revenue: 0,
        };
        ppc.count++;
        ppc.revenue += client.ppcManagementFee;
        planMap.set("PPC", ppc);
      }
    }
    const planBreakdown = Array.from(planMap.values());

    // Setup fees in period
    const setupFees = allClients
      .filter(
        (c) =>
          c.setupFeeAmount &&
          c.startDate &&
          new Date(c.startDate) >= rangeStart &&
          new Date(c.startDate) <= rangeEnd
      )
      .reduce((sum, c) => sum + (c.setupFeeAmount || 0), 0);

    const totalRevenue = mrr + setupFees;

    // Expenses: recurring always at full monthly amount, one-time filtered to period
    const recurringExpenses = allExpenses
      .filter((e) => e.type === "recurring")
      .reduce((sum, e) => sum + e.amount, 0);

    const oneTimeExpenses = allExpenses
      .filter(
        (e) =>
          e.type === "one-time" &&
          new Date(e.date) >= rangeStart &&
          new Date(e.date) <= rangeEnd
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = recurringExpenses + oneTimeExpenses;
    const profit = totalRevenue - totalExpenses;

    // Churn in this period
    const churnedClients = allClients.filter((c) => {
      const cancelDate = c.canceledAt || (c.projectStatus === "Deployed Canceled" ? c.updatedAt : null);
      if (!cancelDate) return false;
      const d = new Date(cancelDate);
      return d >= rangeStart && d <= rangeEnd;
    });

    const activeAtPeriodStart = allClients.filter((c) => {
      const started = c.startDate ? new Date(c.startDate) < rangeStart : true;
      const notCanceledYet =
        isActiveClient(c) ||
        (c.canceledAt && new Date(c.canceledAt) >= rangeStart);
      return started && notCanceledYet;
    }).length;

    const churnRate =
      activeAtPeriodStart > 0
        ? (churnedClients.length / activeAtPeriodStart) * 100
        : 0;

    // Growth in this period
    const newClients = allClients.filter(
      (c) =>
        c.startDate &&
        new Date(c.startDate) >= rangeStart &&
        new Date(c.startDate) <= rangeEnd
    ).length;

    const netGrowth = newClients - churnedClients.length;
    const mrrDelta = mrr - previousMrr;

    // Trends: auto-determined granularity
    const granularity: "weekly" | "monthly" = rangeDays <= 45 ? "weekly" : "monthly";
    const trends: TrendPoint[] = [];

    if (granularity === "monthly") {
      const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (cursor <= rangeEnd) {
        const mStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);

        const periodActive = allClients.filter((c) => {
          const started = c.startDate ? new Date(c.startDate) <= mEnd : true;
          const notCanceled =
            isActiveClient(c) ||
            (c.canceledAt && new Date(c.canceledAt) > mEnd);
          return started && notCanceled;
        });
        const periodMrr = periodActive.reduce((sum, c) => sum + getClientMrr(c), 0);

        const periodRecurring = allExpenses
          .filter((e) => e.type === "recurring")
          .reduce((sum, e) => sum + e.amount, 0);
        const periodOneTime = allExpenses
          .filter(
            (e) =>
              e.type === "one-time" &&
              new Date(e.date) >= mStart &&
              new Date(e.date) <= mEnd
          )
          .reduce((sum, e) => sum + e.amount, 0);

        trends.push({
          label: formatLabel(mStart, "monthly"),
          mrr: periodMrr,
          profit: periodMrr - (periodRecurring + periodOneTime),
        });

        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      const cursor = new Date(rangeStart);
      const dayOfWeek = cursor.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      cursor.setDate(cursor.getDate() + mondayOffset);
      cursor.setHours(0, 0, 0, 0);

      while (cursor <= rangeEnd) {
        const wStart = new Date(cursor);
        const wEnd = new Date(cursor);
        wEnd.setDate(wEnd.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);

        const periodActive = allClients.filter((c) => {
          const started = c.startDate ? new Date(c.startDate) <= wEnd : true;
          const notCanceled =
            isActiveClient(c) ||
            (c.canceledAt && new Date(c.canceledAt) > wEnd);
          return started && notCanceled;
        });
        const periodMrr = periodActive.reduce((sum, c) => sum + getClientMrr(c), 0);

        const periodRecurring = allExpenses
          .filter((e) => e.type === "recurring")
          .reduce((sum, e) => sum + e.amount, 0);
        const periodOneTime = allExpenses
          .filter(
            (e) =>
              e.type === "one-time" &&
              new Date(e.date) >= wStart &&
              new Date(e.date) <= wEnd
          )
          .reduce((sum, e) => sum + e.amount, 0);

        trends.push({
          label: formatLabel(wStart, "weekly"),
          mrr: periodMrr,
          profit: periodMrr - (periodRecurring + periodOneTime),
        });

        cursor.setDate(cursor.getDate() + 7);
      }
    }

    // Expense breakdown by category
    const catMap = new Map<string, number>();
    for (const e of allExpenses) {
      if (e.type === "recurring") {
        catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
      } else if (
        new Date(e.date) >= rangeStart &&
        new Date(e.date) <= rangeEnd
      ) {
        catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
      }
    }
    const expenseBreakdown: ExpenseCategoryBreakdown[] = Array.from(
      catMap.entries()
    ).map(([category, total]) => ({ category, total }));

    const summary: FinancesSummary = {
      mrr,
      previousMrr,
      setupFees,
      totalRevenue,
      totalExpenses,
      profit,
      planBreakdown,
      churnCount: churnedClients.length,
      churnRate,
      churnedClients: churnedClients.map((c) => ({
        id: String(c._id),
        name: c.name,
        businessName: c.businessName,
        canceledAt: (c.canceledAt || c.updatedAt).toISOString(),
      })),
      newClients,
      netGrowth,
      mrrDelta,
      trends,
      expenseBreakdown,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Finances API] Summary error:", err);
    return NextResponse.json(
      { error: "Failed to compute summary" },
      { status: 500 }
    );
  }
}
