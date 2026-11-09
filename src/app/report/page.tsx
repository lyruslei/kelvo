import Link from "next/link";
import { requireSession } from "@/lib/session";
import { niceDate, relativeDay, todayIn } from "@/lib/days";
import { loadDay, loadHistory, loadLastSessions } from "@/lib/store";
import { GROUP_LABELS, REST_WINDOW_DAYS, suggestNext } from "@/lib/schedule";
import { summarizeDay } from "@/lib/turn";
import { MUSCLE_LABELS, type Muscle } from "@/lib/muscles";
import { compare, formatSets, volume, type SimpleSet, type Verdict } from "@/lib/progress";
import styles from "./report.module.css";

export const instant = false;

const VERDICT_LABEL: Record<Verdict, string> = { up: "Up", same: "Same", down: "Down", first: "New" };

export default async function ReportPage() {
  await requireSession();

  const day = todayIn();
  const [data, history] = await Promise.all([loadDay(day), loadHistory(day)]);
  const summary = summarizeDay(data.sets, data.cardio);
  const plan = suggestNext(day, history);

  // Group today's sets by exercise, in the order they were logged.
  const lifts = new Map<number, { name: string; sets: SimpleSet[] }>();
  for (const s of data.sets) {
    const cur = lifts.get(s.exercise_id) ?? { name: s.exercise.name, sets: [] };
    cur.sets.push({ reps: s.reps, weight_kg: s.weight_kg });
    lifts.set(s.exercise_id, cur);
  }
  const last = await loadLastSessions([...lifts.keys()], day);

  const muscles = Object.entries(summary.glow) as [Muscle, "full" | "soft"][];
  const full = muscles.filter(([, g]) => g === "full").map(([m]) => m);
  const soft = muscles.filter(([, g]) => g === "soft").map(([m]) => m);
  const empty = !data.sets.length && !data.cardio.length;

  const upNext = (
    <section className={styles.section} aria-labelledby="next">
      <h2 id="next">Up next</h2>
      <ol className={styles.plan}>
        {plan.map((p) => (
          <li key={p.day} className={p.rest ? styles.planRest : undefined}>
            <span className={styles.planDay}>{relativeDay(p.day, day)}</span>
            <span className={styles.planWhat}>{p.rest ? "Rest day" : p.groups.map((g) => GROUP_LABELS[g]).join(" + ")}</span>
          </li>
        ))}
      </ol>
      <p className={styles.note}>
        Picks what&apos;s rested longest. Hit every group with full glow within {REST_WINDOW_DAYS} days to earn a rest day.
      </p>
    </section>
  );

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>‹ Today</Link>
      </header>

      <main>
        <h1 className={styles.title}>Today&apos;s report</h1>
        <p className={styles.date}>{niceDate(day)}</p>

        {empty ? (
          <>
            <p className={styles.empty}>Nothing logged yet today. Tell the chat what you did and the report fills in.</p>
            {upNext}
          </>
        ) : (
          <>
            <dl className={styles.tiles}>
              <div><dt>Volume</dt><dd>{summary.volumeKg.toLocaleString()}<small> kg</small></dd></div>
              <div><dt>Sets</dt><dd>{summary.sets}</dd></div>
              <div><dt>Exercises</dt><dd>{lifts.size}</dd></div>
              <div><dt>Cardio</dt><dd>{summary.cardioMin}<small> min</small></dd></div>
            </dl>

            {muscles.length > 0 && (
              <section className={styles.section} aria-labelledby="muscles">
                <h2 id="muscles">Muscles worked</h2>
                <ul className={styles.chips}>
                  {full.map((m) => <li key={m} className={styles.full}>{MUSCLE_LABELS[m]}</li>)}
                  {soft.map((m) => <li key={m} className={styles.soft}>{MUSCLE_LABELS[m]}</li>)}
                </ul>
                <p className={styles.legend}>
                  <span className={`${styles.dot} ${styles.full}`} /> Main target
                  <span className={`${styles.dot} ${styles.soft}`} /> Helped
                </p>
              </section>
            )}

            {upNext}

            {lifts.size > 0 && (
              <section className={styles.section} aria-labelledby="lifts">
                <h2 id="lifts">Lifts vs last time</h2>
                <ul className={styles.list}>
                  {[...lifts].map(([id, lift]) => {
                    const prev = last.get(id);
                    const { verdict, note } = compare(lift.sets, prev?.sets ?? null);
                    return (
                      <li key={id} className={styles.lift}>
                        <div className={styles.liftHead}>
                          <h3>{lift.name}</h3>
                          <span className={`${styles.badge} ${styles[verdict]}`}>{VERDICT_LABEL[verdict]}</span>
                        </div>
                        <p className={styles.sets}>{formatSets(lift.sets)} <span className={styles.vol}>· {volume(lift.sets).toLocaleString()} kg</span></p>
                        <p className={styles.note}>
                          {note}
                          {prev && <> · last time {niceDate(prev.day)}: {formatSets(prev.sets)}</>}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {data.cardio.length > 0 && (
              <section className={styles.section} aria-labelledby="cardio">
                <h2 id="cardio">Cardio</h2>
                <ul className={styles.list}>
                  {data.cardio.map((c, i) => (
                    <li key={i} className={styles.lift}>
                      <h3>{c.kind}</h3>
                      <p className={styles.sets}>
                        {c.minutes} min
                        {c.distance_km ? ` · ${c.distance_km} km` : ""}
                        {c.speed_kmh ? ` · ${c.speed_kmh} km/h` : ""}
                        {c.incline_pct ? ` · ${c.incline_pct}% incline` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
                {summary.cardioKm > 0 && <p className={styles.note}>{summary.cardioKm} km total today.</p>}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
