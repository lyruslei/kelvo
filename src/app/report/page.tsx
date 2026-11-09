import Link from "next/link";
import { requireSession } from "@/lib/session";
import { addDays, HISTORY_DAYS, niceDate, parseDay, relativeDay, todayIn } from "@/lib/days";
import { loadDay, loadHistory, loadSessions } from "@/lib/store";
import { GROUP_LABELS, REST_WINDOW_DAYS, suggestNext } from "@/lib/schedule";
import { pace, summarizeDay } from "@/lib/turn";
import { MUSCLE_LABELS, type Muscle } from "@/lib/muscles";
import { compare, formatSets, personalRecord, totalReps, totalSeconds, volume, type SimpleSet } from "@/lib/progress";
import ReportLog, { type CardioView, type LiftView } from "@/components/ReportLog";
import styles from "./report.module.css";

export const instant = false;

export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  await requireSession();

  const today = todayIn();
  const day = parseDay((await searchParams).day, today) ?? today;
  const isToday = day === today;
  const [data, history] = await Promise.all([loadDay(day), isToday ? loadHistory(day) : Promise.resolve(null)]);
  const summary = summarizeDay(data.sets, data.cardio);
  // Suggestions only make sense looking forward from today.
  const plan = history ? suggestNext(day, history) : [];

  // Group the day's sets by exercise, in the order they were logged.
  const lifts = new Map<number, { name: string; sets: SimpleSet[]; ids: number[] }>();
  // Lifts in logging order (rows come by id); sets within a lift by set number.
  for (const s of [...data.sets].sort((a, b) => a.id - b.id)) {
    if (!lifts.has(s.exercise_id)) lifts.set(s.exercise_id, { name: s.exercise.name, sets: [], ids: [] });
  }
  for (const s of [...data.sets].sort((a, b) => a.set_no - b.set_no || a.id - b.id)) {
    const cur = lifts.get(s.exercise_id)!;
    cur.sets.push({ reps: s.reps, weight_kg: s.weight_kg, duration_s: s.duration_s });
    cur.ids.push(s.id);
  }
  const earlier = await loadSessions([...lifts.keys()], day);

  const liftViews: LiftView[] = [...lifts].map(([id, lift]) => {
    const sessions = earlier.get(id) ?? [];
    const prev = sessions[0];
    const { verdict, note } = compare(lift.sets, prev?.sets ?? null);
    const v = volume(lift.sets);
    const reps = totalReps(lift.sets);
    const secs = totalSeconds(lift.sets);
    const amount = v > 0 ? `${v.toLocaleString()} kg` : reps > 0 ? `${reps} reps` : `${Math.round(secs / 6) / 10} min total`;
    return {
      exerciseId: id,
      name: lift.name,
      sets: lift.sets.map((s, i) => ({ id: lift.ids[i], text: formatSets([s]) })),
      summary: formatSets(lift.sets),
      amount,
      verdict,
      note,
      last: prev ? `${niceDate(prev.day)}: ${formatSets(prev.sets)}` : null,
      pr: personalRecord(lift.sets, sessions.map((x) => x.sets)),
    };
  });

  const cardioViews: CardioView[] = data.cardio.map((c) => ({
    id: c.id,
    kind: c.kind,
    line: [
      `${c.minutes} min`,
      c.distance_km ? `${c.distance_km} km` : "",
      pace(c.minutes, c.distance_km) ?? "",
      c.speed_kmh ? `${c.speed_kmh} km/h` : "",
      c.incline_pct ? `${c.incline_pct}% incline` : "",
    ].filter(Boolean).join(" · "),
  }));

  const muscles = Object.entries(summary.glow) as [Muscle, "full" | "soft"][];
  const full = muscles.filter(([, g]) => g === "full").map(([m]) => m);
  const soft = muscles.filter(([, g]) => g === "soft").map(([m]) => m);
  const empty = !data.sets.length && !data.cardio.length;

  const upNext = isToday && (
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
        <Link href={isToday ? "/" : `/?day=${day}`} className={styles.back}>‹ {isToday ? "Today" : "Back"}</Link>
      </header>

      <main>
        <h1 className={styles.title}>{isToday ? "Today's report" : "Day report"}</h1>
        <p className={styles.date}>{niceDate(day)}</p>

        {empty ? (
          <>
            <p className={styles.empty}>Nothing logged on this day. Tell the chat what you did and the report fills in.</p>
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

            <ReportLog
              lifts={liftViews}
              cardio={cardioViews}
              cardioTotal={summary.cardioKm > 0 ? `${summary.cardioKm} km total ${isToday ? "today" : "that day"}.` : null}
              day={day}
              today={today}
              min={addDays(today, -HISTORY_DAYS)}
            />
          </>
        )}

        <p className={styles.weekLink}><Link href="/week">This week by muscle group ›</Link></p>
      </main>
    </div>
  );
}
