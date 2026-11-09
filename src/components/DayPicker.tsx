"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./DayPicker.module.css";

// The "Today ▾" heading: tap it to pick another day to look at (or log to).
export default function DayPicker({ day, today, min, label, basePath = "/" }: { day: string; today: string; min: string; label: string; basePath?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  const go = (d: string) => router.push(d && d !== today ? `${basePath}?day=${d}` : basePath);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>
        <button
          type="button"
          className={styles.button}
          aria-label={`${label}. Choose another day`}
          onClick={() => {
            const el = input.current;
            if (!el) return;
            try { el.showPicker(); } catch { el.focus(); }
          }}
        >
          {label}
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="var(--yellow)" /></svg>
        </button>
      </h1>
      <input
        ref={input}
        type="date"
        className={styles.input}
        value={day}
        min={min}
        max={today}
        aria-label="Pick a day"
        tabIndex={-1}
        onChange={(e) => go(e.target.value)}
      />
      {day !== today && (
        <button type="button" className={styles.today} onClick={() => go(today)}>Back to today</button>
      )}
    </div>
  );
}
