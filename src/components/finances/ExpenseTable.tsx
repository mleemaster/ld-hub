/*
 * Expense table with category filter dropdown.
 * Uses existing Table UI components and Badge for type/category pills.
 */
"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import type { Expense } from "@/lib/finance-types";

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ExpenseTable({ expenses, onEdit }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <p className="text-sm text-text-tertiary py-6 text-center">
        No expenses found
      </p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{expense.name}</span>
                    {expense.autoTracked && (
                      <span className="text-[10px] text-text-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded">
                        AUTO
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(expense.amount)}</TableCell>
                <TableCell>
                  <Badge variant={expense.type === "recurring" ? "info" : "neutral"}>
                    {expense.type === "recurring" ? "Recurring" : "One-Time"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="default">{expense.category}</Badge>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatDate(expense.date)}
                </TableCell>
                <TableCell>
                  {!expense.autoTracked && (
                    <button
                      onClick={() => onEdit(expense)}
                      className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                      </svg>
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {expenses.map((expense) => (
          <div
            key={expense._id}
            onClick={() => !expense.autoTracked && onEdit(expense)}
            className="rounded-xl border border-border-secondary bg-surface-secondary p-3 space-y-1.5 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{expense.name}</span>
                {expense.autoTracked && (
                  <span className="text-[10px] text-text-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded">
                    AUTO
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-text-primary">
                {formatCurrency(expense.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Badge variant={expense.type === "recurring" ? "info" : "neutral"}>
                {expense.type === "recurring" ? "Recurring" : "One-Time"}
              </Badge>
              <Badge variant="default">{expense.category}</Badge>
              <span className="ml-auto">{formatDate(expense.date)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
