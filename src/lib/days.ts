// "Today" in your own time zone (set APP_TIMEZONE, default Asia/Manila), as YYYY-MM-DD.
export function todayIn(timeZone = process.env.APP_TIMEZONE || "Asia/Manila", now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// UTC-safe day math on YYYY-MM-DD strings.
const pad = (n: number) => String(n).padStart(2, "0");
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export const HISTORY_DAYS = 365;

// A ?day= value you may view or log to: a real date, not in the future, within the last year.
export function parseDay(value: unknown, today: string): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  if (addDays(value, 0) !== value) return null; // e.g. 2026-02-31
  if (value > today || value < addDays(today, -HISTORY_DAYS)) return null;
  return value;
}

// Rest days can be planned ahead ("Saturday's a rest day, I have a wedding").
export const REST_AHEAD_DAYS = 60;
export function parseRestDay(value: unknown, today: string): string | null {
  if (typeof value === "string" && value > today && value <= addDays(today, REST_AHEAD_DAYS) && addDays(value, 0) === value) return value;
  return parseDay(value, today);
}

export function niceDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

// "Today", "Tomorrow", or the weekday.
export function relativeDay(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
}

// ---- Month calendars (day picker, activity heatmap) ----
export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
export const monthOf = (d: string) => d.slice(0, 7); // "2026-11"
export const shiftMonth = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const monthName = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

// The month's grid: blanks before the 1st so weeks start on Sunday, then each day.
export function monthGrid(m: string): (string | null)[] {
  const first = `${m}-01`;
  const lead = new Date(`${first}T00:00:00Z`).getUTCDay();
  const days: (string | null)[] = Array(lead).fill(null);
  for (let d = first; monthOf(d) === m; d = addDays(d, 1)) days.push(d);
  return days;
}

// Whole days from `a` to `b` (b later gives a positive number).
export function daysApart(a: string, b: string): number {
  const t = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

// "Nov 17", or "Nov 17, 2026" with the year.
export function shortDate(day: string, withYear = false): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { day: "numeric", month: "short", ...(withYear && { year: "numeric" }), timeZone: "UTC" });
}

// "today", "yesterday", "Sep 5", or "Sep 5, 2025" from another year.
export function dayWord(day: string, today: string): string {
  if (day === today) return "today";
  if (day === addDays(today, -1)) return "yesterday";
  return shortDate(day, day.slice(0, 4) !== today.slice(0, 4));
}
