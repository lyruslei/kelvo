import { addDays, niceDate } from "@/lib/days";
import { loadRange } from "@/lib/store";
import { computeGlow } from "@/lib/muscles";
import { GROUPS, GROUP_LABELS, groupsHit, type Group } from "@/lib/schedule";
import styles from "@/app/report/report.module.css";

const DAYS = 7;

// The 7 days ending `endDay` by muscle group: hard sets (the group was a main target) and days trained.
export default async function WeekView({ endDay, headingLevel = 2 }: { endDay: string; headingLevel?: 2 | 3 }) {
  const from = addDays(endDay, -(DAYS - 1));
  const rows = await loadRange(from, endDay);

  const sets = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>;
  const days = Object.fromEntries(GROUPS.map((g) => [g, new Set<string>()])) as Record<Group, Set<string>>;
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
  const H = headingLevel === 2 ? "h2" : "h3";

  return (
    <>
      <p className={styles.date}>{niceDate(from)} – {niceDate(endDay)}</p>
      <dl className={styles.tiles}>
        <div><dt>Days trained</dt><dd>{trainedDays.size}<small> / {DAYS}</small></dd></div>
        <div><dt>Volume</dt><dd>{Math.round(volume).toLocaleString()}<small> kg</small></dd></div>
      </dl>

      <section className={styles.section} aria-label="Hard sets per muscle group">
        <H className={styles.panelSub}>Hard sets per muscle group</H>
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
          {missed.length ? `Not hit in the last 7 days: ${missed.map((g) => GROUP_LABELS[g]).join(", ")}.` : "Every group got work in the last 7 days."}
          {" "}A set counts for a group when it was a main target of the lift.
        </p>
      </section>
    </>
  );
}
