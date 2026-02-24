/*
 * Custom date picker with calendar dropdown.
 * Replaces native <input type="date"> to match the app's design system.
 * Handles dates as YYYY-MM-DD strings to avoid UTC timezone issues.
 * Optional showTime mode adds hour/minute/AM-PM selectors and outputs YYYY-MM-DDTHH:MM.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { cn, parseLocalDate } from "@/lib/utils";

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  showTime?: boolean;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: Date; current: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      current: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), current: true });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), current: false });
  }

  return days;
}

function parseTime(value: string): { hour: number; minute: number } {
  const timeMatch = value.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) return { hour: +timeMatch[1], minute: +timeMatch[2] };
  return { hour: 9, minute: 0 };
}

function to12Hour(hour24: number): { hour12: number; period: "AM" | "PM" } {
  if (hour24 === 0) return { hour12: 12, period: "AM" };
  if (hour24 < 12) return { hour12: hour24, period: "AM" };
  if (hour24 === 12) return { hour12: 12, period: "PM" };
  return { hour12: hour24 - 12, period: "PM" };
}

function to24Hour(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

const MINUTE_OPTIONS = [0, 15, 30, 45];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DatePicker({ label, value, onChange, error, disabled, showTime }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedTime = showTime ? parseTime(value) : { hour: 9, minute: 0 };
  const [timeHour, setTimeHour] = useState(parsedTime.hour);
  const [timeMinute, setTimeMinute] = useState(parsedTime.minute);

  useEffect(() => {
    if (showTime && value) {
      const t = parseTime(value);
      setTimeHour(t.hour);
      setTimeMinute(t.minute);
    }
  }, [value, showTime]);

  function emitValue(dateStr: string, hour: number, minute: number) {
    if (showTime) {
      onChange(`${dateStr}T${pad(hour)}:${pad(minute)}`);
    } else {
      onChange(dateStr);
    }
  }

  function toggleOpen() {
    if (disabled) return;
    const next = !open;
    if (next) {
      const target = selected ?? today;
      setViewYear(target.getFullYear());
      setViewMonth(target.getMonth());
    }
    setOpen(next);
  }

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

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(d: Date) {
    if (showTime) {
      emitValue(toYMD(d), timeHour, timeMinute);
    } else {
      onChange(toYMD(d));
      setOpen(false);
    }
  }

  const days = getCalendarDays(viewYear, viewMonth);

  const displayValue = (() => {
    if (!selected) return "";
    const dateStr = selected.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!showTime || !value.includes("T")) return dateStr;
    const { hour12, period } = to12Hour(timeHour);
    return `${dateStr} at ${hour12}:${pad(timeMinute)} ${period}`;
  })();

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-text-primary">{label}</label>
      )}
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-secondary border text-sm transition-all text-left",
          error ? "border-danger" : "border-border",
          open && "ring-2 ring-accent border-transparent",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span className={displayValue ? "text-text-primary" : "text-text-tertiary"}>
          {displayValue || (showTime ? "Select date & time..." : "Select date...")}
        </span>
        <svg className="w-4 h-4 text-text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </button>

      {error && <p className="text-xs text-danger">{error}</p>}

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 w-72 rounded-2xl border border-border bg-surface shadow-lg p-3">
          {/* Month/year nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-medium text-text-primary">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-text-tertiary py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map(({ date, current }, i) => {
              const isSelected = selected && isSameDay(date, selected);
              const isToday = isSameDay(date, today);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(date)}
                  className={cn(
                    "w-full aspect-square flex items-center justify-center text-xs rounded-lg transition-colors cursor-pointer",
                    !current && "text-text-tertiary/40",
                    current && !isSelected && "text-text-primary hover:bg-surface-tertiary",
                    isSelected && "bg-accent text-white font-medium",
                    isToday && !isSelected && "ring-1 ring-accent font-medium"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time selector */}
          {showTime && selected && (
            <div className="mt-2 pt-2 border-t border-border-secondary">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-secondary">Time</span>
                <div className="flex items-center gap-1 flex-1">
                  <select
                    value={to12Hour(timeHour).hour12}
                    onChange={(e) => {
                      const h12 = +e.target.value;
                      const newHour = to24Hour(h12, to12Hour(timeHour).period);
                      setTimeHour(newHour);
                      emitValue(toYMD(selected), newHour, timeMinute);
                    }}
                    className="flex-1 rounded-lg bg-surface-secondary border border-border px-2 py-1.5 text-xs text-text-primary cursor-pointer"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-text-tertiary text-xs">:</span>
                  <select
                    value={timeMinute}
                    onChange={(e) => {
                      const newMin = +e.target.value;
                      setTimeMinute(newMin);
                      emitValue(toYMD(selected), timeHour, newMin);
                    }}
                    className="flex-1 rounded-lg bg-surface-secondary border border-border px-2 py-1.5 text-xs text-text-primary cursor-pointer"
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>{pad(m)}</option>
                    ))}
                  </select>
                  <select
                    value={to12Hour(timeHour).period}
                    onChange={(e) => {
                      const newPeriod = e.target.value as "AM" | "PM";
                      const { hour12 } = to12Hour(timeHour);
                      const newHour = to24Hour(hour12, newPeriod);
                      setTimeHour(newHour);
                      emitValue(toYMD(selected), newHour, timeMinute);
                    }}
                    className="rounded-lg bg-surface-secondary border border-border px-2 py-1.5 text-xs text-text-primary cursor-pointer"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Done / Clear */}
          <div className="mt-2 pt-2 border-t border-border-secondary flex items-center justify-between">
            {value ? (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              >
                Clear
              </button>
            ) : <span />}
            {showTime && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-accent hover:text-accent/80 transition-colors cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
