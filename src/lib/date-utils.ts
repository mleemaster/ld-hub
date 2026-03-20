/*
 * Eastern-Time date utilities.
 * Every "what day is it?" or "start/end of today" question should go through
 * these helpers so the app behaves consistently regardless of whether the code
 * runs on a UTC server (Vercel) or in the user's browser.
 */

const TZ = "America/New_York";

/** Date object whose local-date methods reflect the current ET wall-clock. */
export function nowET(): Date {
  const s = new Date().toLocaleString("en-US", { timeZone: TZ });
  return new Date(s);
}

/** Format a Date as YYYY-MM-DD in Eastern Time. */
export function toYMD(d: Date): string {
  const parts = d.toLocaleDateString("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-US returns MM/DD/YYYY
  const [m, day, y] = parts.split("/");
  return `${y}-${m}-${day}`;
}

/** Midnight ET today as a Date (in server-local time). */
export function startOfDayET(): Date {
  const et = nowET();
  et.setHours(0, 0, 0, 0);
  return et;
}

/** 23:59:59.999 ET today as a Date. */
export function endOfDayET(): Date {
  const et = nowET();
  et.setHours(23, 59, 59, 999);
  return et;
}
