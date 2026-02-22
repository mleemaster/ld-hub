/*
 * Time-period selector dropdown with standard financial presets.
 * Shows inline DatePickers when "Custom Range" is selected.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import DatePicker from "@/components/ui/DatePicker";
import type { TimePeriod } from "@/lib/finance-types";

interface TimePeriodSelectorProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}

const presets: { value: TimePeriod; label: string }[] = [
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "ytd", label: "Year to Date" },
  { value: "last12Months", label: "Last 12 Months" },
  { value: "custom", label: "Custom Range" },
];

export default function TimePeriodToggle({
  period,
  onPeriodChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: TimePeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = presets.find((p) => p.value === period);

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
    <div className="flex items-center gap-3">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-surface-secondary border border-border text-sm font-medium transition-all cursor-pointer min-w-[180px]",
            open && "ring-2 ring-accent border-transparent"
          )}
        >
          <span className="text-text-primary">{selected?.label}</span>
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

        {open && (
          <div className="absolute z-50 top-full mt-1.5 right-0 w-52 rounded-2xl border border-border bg-surface shadow-lg py-1.5">
            {presets.map((preset) => {
              const isSelected = preset.value === period;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    onPeriodChange(preset.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer text-left",
                    isSelected
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-text-primary hover:bg-surface-tertiary"
                  )}
                >
                  <span>{preset.label}</span>
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

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <DatePicker label="" value={customStart} onChange={onCustomStartChange} />
          <span className="text-text-tertiary text-sm">to</span>
          <DatePicker label="" value={customEnd} onChange={onCustomEndChange} />
        </div>
      )}
    </div>
  );
}
