import Link from "next/link";
import { requireSession } from "@/lib/session";
import { addDays, niceDate, todayIn } from "@/lib/days";
import { loadRange } from "@/lib/store";
import { computeGlow } from "@/lib/muscles";
import { GROUPS, GROUP_LABELS, groupsHit, type Group } from "@/lib/schedule";
import styles from "../report/report.module.css";

export const instant = false;

const DAYS = 7;

// The last 7 days by muscle group: hard sets (where the group was a main target) and days trained.
export default async function WeekPage() {
  await requireSession();
  const today = todayIn();
  const from = addDays(today, -(DAYS - 1));
  const rows = await loadRange(from, today);

  const sets: Record<Group, number> = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>;
  const days: Record<Group, Set<string>> = Object.fromEntries(GROUPS.map((g) => [g, new Set<string>()])) as Record<Group, Set<string>>;
  let volume = 0;
  const trainedDays = new Set<string>();
  for (const r of rows) {
    trainedDays.add(r.day);
    volume += (r.reps ?? 0) * r.weight_kg;
    for (const g of groupsHit(computeGlow([{ primary: r.exercise.primary_muscles, secondary: [] }]))) {
      sets[g]++;
      days[g].add(r.day);
    }
  }
  const max = Math.max(1, ...GROUPS.map((g) => sets[g]));
  const missed = GROUPS.filter((g) => sets[g] === 0);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/report" className={styles.back}>‹ Report</Link>
      </header>
      <main>
        <h1 className={styles.title}>This week</h1>
        <p className={styles.date}>{niceDate(from)} – {niceDate(today)}</p>

        <dl className={styles.tiles}>
          <div><dt>Days trained</dt><dd>{trainedDays.size}<small> / {DAYS}</small></dd></div>
          <div><dt>Volume</dt><dd>{Math.round(volume).toLocaleString()}<small> kg</small></dd></div>
        </dl>

        <section className={styles.section} aria-labelledby="groups">
          <h2 id="groups">Hard sets per muscle group</h2>
          <ul className={styles.bars}>
            {GROUPS.map((g) => (
              <li key={g}>
                <span className={styles.barLabel}>{GROUP_LABELS[g]}</span>
                <span className={styles.barTrack}>
                  <span className={styles.barFill} style={{ width: `${(sets[g] / max) * 100}%` }} />
                </span>
                <span className={styles.barValue}>
                  {sets[g]} set{sets[g] === 1 ? "" : "s"}
                  <small> · {days[g].size}d</small>
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            {missed.length ? `Not hit this week: ${missed.map((g) => GROUP_LABELS[g]).join(", ")}.` : "Every group got work this week."}
            {" "}A set counts for a group when it was a main target of the lift.
          </p>
        </section>
      </main>
    </div>
  );
}
