import SlideLink from "@/components/SlideLink";
import PageSlide from "@/components/PageSlide";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { niceDate } from "@/lib/days";
import { loadExercise, loadSessions } from "@/lib/store";
import { MUSCLE_LABELS } from "@/lib/muscles";
import { formatSets, personalRecord, topSet, totalReps, totalSeconds, volume } from "@/lib/progress";
import styles from "../../report/report.module.css";

export const instant = false;

const MAX_POINTS = 20;

// One lift over time: a chart of the top set per session, and every session with its records.
export default async function LiftPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [exercise, sessionsById] = await Promise.all([loadExercise(id), loadSessions([id])]);
  if (!exercise) notFound();

  const sessions = sessionsById.get(id) ?? []; // newest first
  const oldestFirst = [...sessions].reverse();
  const withPr = oldestFirst.map((s, i) => ({ ...s, pr: personalRecord(s.sets, oldestFirst.slice(0, i).map((x) => x.sets)) }));

  // What the chart plots: top weight, or best reps (bodyweight), or longest hold (timed).
  const weighted = sessions.some((s) => s.sets.some((x) => x.weight_kg > 0 && x.reps));
  const timed = !weighted && sessions.every((s) => s.sets.every((x) => !x.reps));
  const value = (sets: typeof sessions[number]["sets"]) => {
    const t = topSet(sets);
    return weighted ? t.weight_kg : timed ? t.duration_s : Math.max(...sets.map((x) => x.reps ?? 0));
  };
  const unit = weighted ? "kg" : timed ? "s" : "reps";
  const points = oldestFirst.slice(-MAX_POINTS).map((s) => ({ day: s.day, v: value(s.sets) }));

  return (
    <PageSlide>
    <div className={styles.shell}>
      <header className={styles.header}>
        <SlideLink href="/report" className={styles.back} slide="back">‹ Session</SlideLink>
      </header>
      <main>
        <h1 className={styles.title} style={{ textTransform: "capitalize" }}>{exercise.name}</h1>
        <p className={styles.date}>
          {sessions.length} session{sessions.length === 1 ? "" : "s"} · {exercise.primary_muscles.map((m) => MUSCLE_LABELS[m]).join(", ")}
        </p>

        {points.length >= 2 ? <Chart points={points} unit={unit} /> : <p className={styles.empty}>Log this lift a couple more times and a chart appears here.</p>}

        <section className={styles.section} aria-labelledby="sessions">
          <h2 id="sessions">Sessions</h2>
          <ul className={styles.list}>
            {[...withPr].reverse().map((s) => {
              const v = volume(s.sets);
              const amount = v > 0 ? `${v.toLocaleString()} kg` : totalReps(s.sets) ? `${totalReps(s.sets)} reps` : `${totalSeconds(s.sets)}s total`;
              return (
                <li key={s.day} className={styles.lift}>
                  <div className={styles.liftHead}>
                    <h3>{niceDate(s.day)}</h3>
                    {s.pr && <span className={`${styles.badge} ${styles.pr}`}>PR</span>}
                  </div>
                  <p className={styles.sets}>{formatSets(s.sets)} <span className={styles.vol}>· {amount}</span></p>
                  {s.pr && <p className={styles.prNote}>{s.pr}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
    </PageSlide>
  );
}

function Chart({ points, unit }: { points: { day: string; v: number }[]; unit: string }) {
  const W = 340, H = 160, PAD = 24;
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const span = hi - lo || 1;
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (points.length - 1);
  const y = (v: number) => H - PAD - ((v - lo) * (H - 2 * PAD)) / span;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const label = `Top set over ${points.length} sessions, from ${points[0].v}${unit} to ${last.v}${unit}`;

  return (
    <figure className={styles.chart} aria-label={label} role="img">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true">
        <line x1={PAD} x2={W - PAD} y1={y(hi)} y2={y(hi)} stroke="var(--card-raised)" />
        <line x1={PAD} x2={W - PAD} y1={y(lo)} y2={y(lo)} stroke="var(--card-raised)" />
        <text x={PAD} y={y(hi) - 6} fill="var(--gray)" fontSize="11">{hi}{unit}</text>
        <text x={PAD} y={y(lo) + 16} fill="var(--gray)" fontSize="11">{lo}{unit}</text>
        <path d={path} fill="none" stroke="var(--yellow)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.day} cx={x(i)} cy={y(p.v)} r={i === points.length - 1 ? 4.5 : 3} fill={i === points.length - 1 ? "var(--yellow)" : "var(--yellow-deep)"} />
        ))}
      </svg>
      <figcaption className={styles.note}>Top set per session · latest {last.v}{unit} on {niceDate(last.day)}</figcaption>
    </figure>
  );
}
