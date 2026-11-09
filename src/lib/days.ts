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
