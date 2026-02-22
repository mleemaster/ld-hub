/*
 * Custom select dropdown with styled trigger and option list.
 * Matches the app's design system (same patterns as DatePicker).
 * Replaces the native <select> for a consistent look across platforms.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SelectProps {
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function Select({
  label,
  options,
  value,
  onChange,
  error,
  placeholder,
  className,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label || placeholder || "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative space-y-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-text-primary">{label}</label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-secondary border text-sm transition-all text-left",
          error ? "border-danger" : "border-border",
          open && "ring-2 ring-accent border-transparent",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span className={selected ? "text-text-primary" : "text-text-tertiary"}>
          {displayLabel}
        </span>
        <svg
          className={cn("w-4 h-4 text-text-tertiary shrink-0 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {error && <p className="text-xs text-danger">{error}</p>}

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 w-full rounded-2xl border border-border bg-surface shadow-lg py-1.5 max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer text-left",
                  isSelected
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-text-primary hover:bg-surface-tertiary"
                )}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
