/*
 * Expense model for tracking business costs.
 * Auto-tracked expenses (Stripe fees, API costs) and
 * manually entered expenses (hosting, tools, etc.).
 * Used by the Finances section for profit calculation.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";
import {
  EXPENSE_TYPES,
  EXPENSE_CATEGORIES,
  type ExpenseType,
  type ExpenseCategory,
} from "@/lib/expense-constants";
export { EXPENSE_TYPES, EXPENSE_CATEGORIES };
export type { ExpenseType, ExpenseCategory };

export interface IExpense extends Document {
  name: string;
  amount: number;
  type: ExpenseType;
  category: ExpenseCategory;
  date: Date;
  autoTracked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: EXPENSE_TYPES, required: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    date: { type: Date, required: true },
    autoTracked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
