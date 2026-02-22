/*
 * Modal form for adding or editing an expense.
 * Follows ClientForm patterns with inline validation.
 */
"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Button from "@/components/ui/Button";
import { EXPENSE_TYPES, EXPENSE_CATEGORIES } from "@/lib/expense-constants";
import type { Expense, ExpenseFormData } from "@/lib/finance-types";

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
  onDelete?: () => void;
  initialData?: Expense | null;
  submitting?: boolean;
}

function toDateInputValue(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const typeOptions = EXPENSE_TYPES.map((t) => ({ value: t, label: t === "one-time" ? "One-Time" : "Recurring" }));
const categoryOptions = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }));

function getInitialForm(initialData?: Expense | null): ExpenseFormData {
  if (initialData) {
    return {
      name: initialData.name,
      amount: String(initialData.amount),
      type: initialData.type,
      category: initialData.category,
      date: toDateInputValue(initialData.date),
    };
  }
  return {
    name: "",
    amount: "",
    type: "recurring",
    category: "Software",
    date: toDateInputValue(new Date().toISOString()),
  };
}

export default function ExpenseForm({
  open,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  submitting,
}: ExpenseFormProps) {
  return (
    <Modal open={open} onClose={onClose} title={initialData ? "Edit Expense" : "Add Expense"}>
      <ExpenseFormInner
        key={initialData?._id ?? "new"}
        initialData={initialData}
        onSubmit={onSubmit}
        onClose={onClose}
        onDelete={onDelete}
        submitting={submitting}
      />
    </Modal>
  );
}

function ExpenseFormInner({
  initialData,
  onSubmit,
  onClose,
  onDelete,
  submitting,
}: Omit<ExpenseFormProps, "open">) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<ExpenseFormData>(() => getInitialForm(initialData));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleChange(field: keyof ExpenseFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      newErrors.amount = "Valid amount is required";
    if (!form.date) newErrors.date = "Date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
        placeholder="e.g. Vercel Pro"
        error={errors.name}
      />

      <Input
        label="Amount ($/mo)"
        type="number"
        step="0.01"
        min="0"
        value={form.amount}
        onChange={(e) => handleChange("amount", e.target.value)}
        placeholder="0.00"
        error={errors.amount}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Type"
          options={typeOptions}
          value={form.type}
          onChange={(v) => handleChange("type", v)}
        />
        <Select
          label="Category"
          options={categoryOptions}
          value={form.category}
          onChange={(v) => handleChange("category", v)}
        />
      </div>

      <DatePicker
        label="Date"
        value={form.date}
        onChange={(v) => handleChange("date", v)}
        error={errors.date}
      />

      <div className="flex items-center justify-between pt-2">
        {isEdit && onDelete ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-danger">Delete this expense?</span>
              <Button type="button" variant="danger" size="sm" onClick={onDelete} loading={submitting}>
                Confirm
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <span className="text-danger">Delete</span>
            </Button>
          )
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Save" : "Add Expense"}
          </Button>
        </div>
      </div>
    </form>
  );
}
