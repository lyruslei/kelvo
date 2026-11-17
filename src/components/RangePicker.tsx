"use client";
import { useRouter } from "next/navigation";
import { shortDate } from "@/lib/days";
import styles from "@/app/activity/progress/progress.module.css";

// From / To for the custom compare. Only days with a photo are listed.
export default function RangePicker({ days, from, to, month }: { days: string[]; from: string; to: string; month: string }) {
  const router = useRouter();
  const go = (f: string, t: string) => router.replace(`/activity/progress?mode=custom&month=${month}&from=${f}&to=${t}`);

  return (
    <div className={styles.range}>
      <label>
        <span>From</span>
        <select value={from} onChange={(e) => go(e.target.value, to)}>
          {days.map((d) => <option key={d} value={d}>{shortDate(d, true)}</option>)}
        </select>
      </label>
      <label>
        <span>To</span>
        <select value={to} onChange={(e) => go(from, e.target.value)}>
          {days.map((d) => <option key={d} value={d}>{shortDate(d, true)}</option>)}
        </select>
      </label>
    </div>
  );
}
