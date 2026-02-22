/*
 * Shared utility functions for LeeMaster Design Hub.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function parseLocalDate(val: string | Date | undefined | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: Date | string): string {
  const d = parseLocalDate(date);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
