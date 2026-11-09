import Link from "next/link";
import { requireSession } from "@/lib/session";
import { todayIn } from "@/lib/days";
import WeekView from "@/components/WeekView";
import styles from "../report/report.module.css";

export const instant = false;

// Stand-alone week page (the report also shows this as its last swipe panel).
export default async function WeekPage() {
  await requireSession();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/report" className={styles.back}>‹ Report</Link>
      </header>
      <main>
        <h1 className={styles.title}>This week</h1>
        <WeekView endDay={todayIn()} />
      </main>
    </div>
  );
}
