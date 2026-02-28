/*
 * Client-safe types for the finances page and components.
 * Keeps mongoose out of client bundles.
 */
import type { ExpenseType, ExpenseCategory } from "@/lib/expense-constants";

export type TimePeriod = "last7" | "last30" | "thisMonth" | "ytd" | "last12Months" | "custom";

export interface PlanBreakdown {
  tier: string;
  count: number;
  revenue: number;
}

export interface TrendPoint {
  label: string;
  mrr: number;
  profit: number;
}

export interface ChurnedClient {
  id: string;
  name: string;
  businessName: string;
  canceledAt: string;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  total: number;
}

export interface FinancesSummary {
  mrr: number;
  previousMrr: number;
  totalRevenue: number;
  previousRevenue: number;
  totalExpenses: number;
  profit: number;
  planBreakdown: PlanBreakdown[];
  churnCount: number;
  churnRate: number;
  churnedClients: ChurnedClient[];
  newClients: number;
  netGrowth: number;
  mrrDelta: number;
  trends: TrendPoint[];
  expenseBreakdown: ExpenseCategoryBreakdown[];
}

export interface Expense {
  _id: string;
  name: string;
  amount: number;
  type: ExpenseType;
  category: ExpenseCategory;
  date: string;
  autoTracked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFormData {
  name: string;
  amount: string;
  type: ExpenseType;
  category: ExpenseCategory;
  date: string;
}
