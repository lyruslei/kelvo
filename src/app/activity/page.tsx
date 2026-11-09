import Link from "next/link";
import PageSlide from "@/components/PageSlide";
import { requireSession } from "@/lib/session";
import { addDays, HISTORY_DAYS, monthGrid, monthName, monthOf, shiftMonth, todayIn, WEEKDAYS } from "@/lib/days";
import { loadCardioDays, loadRange } from "@/lib/store";
import report from "../report/report.module.css";
import styles from "./activity.module.css";

export const instant = false;

// The month at a glance: yellow if you trained (any lift or cardio), empty if you rested. Tap a day to open it.
export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await requireSession();
  const today = todayIn();
  const thisMonth = monthOf(today);
  const oldest = monthOf(addDays(today, -HISTORY_DAYS));
  const asked = (await searchParams).month;
  const month = typeof asked === "string" && /^\d{4}-\d{2}$/.test(asked) && asked <= thisMonth && asked >= oldest ? asked : thisMonth;

  const from = `${month}-01`;
  const to = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const [sets, cardio] = await Promise.all([loadRange(from, to), loadCardioDays(from, to)]);

  const setsOn = new Map<string, number>();
  for (const s of sets) setsOn.set(s.day, (setsOn.get(s.day) ?? 0) + 1);
  const trained = new Set([...setsOn.keys(), ...cardio]);
  const volume = Math.round(sets.reduce((sum, s) => sum + (s.reps ?? 0) * s.weight_kg, 0));

  return (
    <PageSlide>
      <div className={report.shell}>
        <main>
          <h1 className={report.title}>Activity</h1>

          <div className={styles.monthBar}>
            {month > oldest
              ? <Link href={`/activity?month=${shiftMonth(month, -1)}`} className={styles.arrow} aria-label="Previous month">‹</Link>
              : <span className={styles.arrow} />}
            <h2 className={styles.month}>{monthName(month)}</h2>
            {month < thisMonth
              ? <Link href={`/activity?month=${shiftMonth(month, 1)}`} className={styles.arrow} aria-label="Next month">›</Link>
              : <span className={styles.arrow} />}
          </div>

          <dl className={styles.totals}>
            <div><dt>Days trained</dt><dd>{trained.size}</dd></div>
            <div><dt>Sets</dt><dd>{sets.length}</dd></div>
            <div><dt>Volume</dt><dd>{volume.toLocaleString()}<small> kg</small></dd></div>
          </dl>

          <div className={styles.grid}>
            {WEEKDAYS.map((w, i) => <span key={i} className={styles.weekday} aria-hidden="true">{w}</span>)}
            {monthGrid(month).map((d, i) => {
              if (!d) return <span key={`b${i}`} />;
              const active = trained.has(d);
              const label = `${d}: ${active ? "trained" : "rest"}`;
              const cls = `${styles.cell} ${active ? styles.active : ""} ${d === today ? styles.today : ""}`;
              return d > today
                ? <span key={d} className={`${styles.cell} ${styles.future}`}>{Number(d.slice(8))}</span>
                : <Link key={d} href={d === today ? "/" : `/?day=${d}`} className={cls} aria-label={label} transitionTypes={["nav-forward"]}>{Number(d.slice(8))}</Link>;
            })}
          </div>

          <p className={styles.legend} aria-hidden="true">
            <span className={`${styles.swatch} ${styles.active}`} /> Trained
            <span className={styles.swatch} /> Rest
          </p>
        </main>
      </div>
    </PageSlide>
  );
}
