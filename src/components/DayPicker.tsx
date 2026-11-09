"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, monthGrid, monthName, monthOf, shiftMonth, WEEKDAYS } from "@/lib/days";
import styles from "./DayPicker.module.css";

// The "Today ▾" heading: tap it to pick another day to look at (or log to).
export default function DayPicker({ day, today, min, label, basePath = "/" }: { day: string; today: string; min: string; label: string; basePath?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(day));
  const panel = useRef<HTMLDivElement>(null);
  const yesterday = addDays(today, -1);

  const go = (d: string) => {
    setOpen(false);
    if (d !== day) router.push(d !== today ? `${basePath}?day=${d}` : basePath);
  };

  // Close on Escape or a tap outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (panel.current && !panel.current.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  const quick = (d: string, text: string) => (
    <button type="button" className={`${styles.quick} ${day === d ? styles.on : ""}`} onClick={() => go(d)}>{text}</button>
  );

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>
        <button
          type="button"
          className={styles.button}
          aria-label={`${label}. Choose another day`}
          aria-expanded={open}
          onClick={() => { setMonth(monthOf(day)); setOpen(!open); }}
        >
          {label}
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className={open ? styles.flip : undefined}>
            <path d="M2 4l4 4 4-4" fill="var(--yellow)" />
          </svg>
        </button>
      </h1>
      {day !== today && (
        <button type="button" className={styles.today} onClick={() => go(today)}>Back to today</button>
      )}

      {open && (
        <div ref={panel} className={styles.panel} role="dialog" aria-label="Choose a day">
          <h2 className={styles.title}>Choose a day</h2>
          <div className={styles.quicks}>
            {quick(today, "Today")}
            {quick(yesterday, "Yesterday")}
          </div>

          <div className={styles.monthBar}>
            <button type="button" className={styles.arrow} aria-label="Previous month" disabled={month <= monthOf(min)} onClick={() => setMonth(shiftMonth(month, -1))}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M8 2L3 6l5 4z" fill="currentColor" /></svg>
            </button>
            <span className={styles.month}>{monthName(month)}</span>
            <button type="button" className={styles.arrow} aria-label="Next month" disabled={month >= monthOf(today)} onClick={() => setMonth(shiftMonth(month, 1))}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M4 2l5 4-5 4z" fill="currentColor" /></svg>
            </button>
          </div>

          <div className={styles.grid} role="grid">
            {WEEKDAYS.map((w, i) => <span key={i} className={styles.weekday} aria-hidden="true">{w}</span>)}
            {monthGrid(month).map((d, i) =>
              d === null ? <span key={`b${i}`} /> : (
                <button
                  key={d}
                  type="button"
                  className={`${styles.date} ${d === day ? styles.picked : ""} ${d === today && d !== day ? styles.isToday : ""}`}
                  disabled={d > today || d < min}
                  aria-current={d === day ? "date" : undefined}
                  aria-label={new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                  onClick={() => go(d)}
                >
                  {Number(d.slice(8))}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
