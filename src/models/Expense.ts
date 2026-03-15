/*
 * Expense model for tracking business costs.
 * Auto-tracked expenses (Stripe fees, API costs) and
 * manually entered expenses (hosting, tools, etc.).
 * Used by the Finances section for profit calculation.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";
import {
  EXPENSE_TYPES,
  EXPENSE_FREQUENCIES,
  EXPENSE_CATEGORIES,
  type ExpenseType,
  type ExpenseFrequency,
  type ExpenseCategory,
} from "@/lib/expense-constants";
export { EXPENSE_TYPES, EXPENSE_FREQUENCIES, EXPENSE_CATEGORIES };
export type { ExpenseType, ExpenseFrequency, ExpenseCategory };

export interface IExpense extends Document {
  name: string;
  amount: number;
  type: ExpenseType;
  frequency: ExpenseFrequency;
  category: ExpenseCategory;
  date: Date;
  autoTracked: boolean;
  clientId?: mongoose.Types.ObjectId;
  clientName?: string;
  stripeInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: EXPENSE_TYPES, required: true },
    frequency: { type: String, enum: EXPENSE_FREQUENCIES, default: "monthly" },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    date: { type: Date, required: true },
    autoTracked: { type: Boolean, default: false },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    clientName: { type: String, default: null },
    stripeInvoiceId: { type: String, default: null, unique: true, sparse: true },
  },
  { timestamps: true }
);

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
