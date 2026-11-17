import Link from "next/link";
import SlideLink from "@/components/SlideLink";
import PageSlide from "@/components/PageSlide";
import { requireSession } from "@/lib/session";
import SnapPhoto from "@/components/SnapPhoto";
import { addDays, dayWord, HISTORY_DAYS, monthGrid, monthName, monthOf, parseDay, shiftMonth, todayIn, WEEKDAYS } from "@/lib/days";
import { loadCardioDays, loadPhotoDays, loadRange } from "@/lib/store";
import report from "../report/report.module.css";
import styles from "./activity.module.css";

export const instant = false;

// The month at a glance: yellow if you trained (any lift or cardio), empty if you rested.
// Tap a day to select it (?day=); the progress photo button saves to the selected day.
export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await requireSession();
  const params = await searchParams;
  const today = todayIn();
  const thisMonth = monthOf(today);
  const oldest = monthOf(addDays(today, -HISTORY_DAYS));
  const picked = parseDay(params.day, today);
  const asked = params.month;
  const month = typeof asked === "string" && /^\d{4}-\d{2}$/.test(asked) && asked <= thisMonth && asked >= oldest ? asked : picked ? monthOf(picked) : thisMonth;
  const selected = picked && monthOf(picked) === month ? picked : today;

  const from = `${month}-01`;
  const to = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const [sets, cardio, photoDays] = await Promise.all([loadRange(from, to), loadCardioDays(from, to), loadPhotoDays()]);
  const snapped = new Set(photoDays.filter((d) => monthOf(d) === month));

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
              const label = `${d}: ${active ? "trained" : "rest"}${snapped.has(d) ? ", progress photo" : ""}`;
              const cls = `${styles.cell} ${active ? styles.active : ""} ${d === today ? styles.today : ""} ${d === selected && d !== today ? styles.selected : ""}`;
              return d > today
                ? <span key={d} className={`${styles.cell} ${styles.future}`}>{Number(d.slice(8))}</span>
                : <Link key={d} href={d === today ? `/activity?month=${month}` : `/activity?month=${month}&day=${d}`} replace scroll={false}
                    className={cls} aria-label={label} aria-current={d === selected ? "date" : undefined}>
                    {Number(d.slice(8))}
                    {snapped.has(d) && <span className={styles.dot} />}
                  </Link>;
            })}
          </div>

          <p className={styles.legend} aria-hidden="true">
            <span className={`${styles.swatch} ${styles.active}`} /> Trained
            <span className={styles.swatch} /> Rest
            <span className={styles.dotKey} /> Photo
          </p>

          {/* Starts on the selected day; the Save screen can still switch it. */}
          <SnapPhoto today={today} start={selected} taken={photoDays} className={styles.snap}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={styles.snapIcon}>
              <path d="M9 4h6l1.5 2H20a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1h3.5zM12 9a4 4 0 100 8 4 4 0 000-8z" fill="currentColor" />
            </svg>
            <span className={styles.snapText}>Add progress photo for {dayWord(selected, today)}</span>
            <span className={styles.chevron} aria-hidden="true">›</span>
          </SnapPhoto>

          {photoDays.length > 0 && (
            <SlideLink href={`/activity/progress?month=${month}`} className={styles.seeProgress} slide="forward">See your progress →</SlideLink>
          )}
        </main>
      </div>
    </PageSlide>
  );
}
