"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLogged, moveLogged } from "@/app/actions";
import type { Verdict } from "@/lib/progress";
import styles from "@/app/report/report.module.css";

export type LiftView = {
  exerciseId: number;
  name: string;
  sets: { id: number; text: string }[];
  summary: string; // "3x10 @ 24kg, 8 @ 26kg"
  amount: string; // "702 kg" / "45 reps" / "3 min total"
  verdict: Verdict;
  note: string;
  last: string | null; // "Mon 2 Nov: 3x10 @ 24kg"
  pr: string | null;
};
export type CardioView = { id: number; kind: string; line: string };

const VERDICT_LABEL: Record<Verdict, string> = { up: "Up", same: "Same", down: "Down", first: "New" };

// The day's lifts and cardio, with an Edit mode to delete entries or move them to another day.
export default function ReportLog({ lifts, cardio, cardioTotal, day, today, min }: {
  lifts: LiftView[];
  cardio: CardioView[];
  cardioTotal: string | null;
  day: string;
  today: string;
  min: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState<Set<number>>(new Set());
  const [runs, setRuns] = useState<Set<number>>(new Set());
  const [moveTo, setMoveTo] = useState(day === today ? "" : today);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const allSetIds = lifts.flatMap((l) => l.sets.map((s) => s.id));
  const count = sets.size + runs.size;
  const total = allSetIds.length + cardio.length;

  const toggle = (set: Set<number>, ids: number[], on: boolean) => {
    const next = new Set(set);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    return next;
  };
  const reset = () => { setSets(new Set()); setRuns(new Set()); setConfirmDelete(false); setError(""); };
  const stopEditing = () => { reset(); setEditing(false); };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Something went wrong.");
      stopEditing();
      router.refresh();
    });

  const onDelete = () => {
    if (!count) return setError("Select something first.");
    if (!confirmDelete) return setConfirmDelete(true);
    run(() => deleteLogged([...sets], [...runs]));
  };
  const onMove = () => {
    if (!count) return setError("Select something first.");
    if (!moveTo) return setError("Pick a day to move to.");
    if (moveTo === day) return setError("That's the day they're already on.");
    run(() => moveLogged([...sets], [...runs], moveTo));
  };

  if (!lifts.length && !cardio.length) return null;

  return (
    <>
      <div className={styles.editBar}>
        <h2 className={styles.editTitle}>{editing ? "Select entries" : "Logged"}</h2>
        <button type="button" className={styles.editToggle} onClick={() => (editing ? stopEditing() : setEditing(true))}>
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {lifts.length > 0 && (
        <section className={styles.section} aria-labelledby="lifts">
          <h2 id="lifts" className={styles.sub}>Lifts vs last time</h2>
          <ul className={styles.list}>
            {lifts.map((lift) => {
              const ids = lift.sets.map((s) => s.id);
              const allOn = ids.every((id) => sets.has(id));
              return (
                <li key={lift.exerciseId} className={`${styles.lift} ${editing && ids.some((id) => sets.has(id)) ? styles.selected : ""}`}>
                  <div className={styles.liftHead}>
                    {editing ? (
                      <label className={styles.check}>
                        <input type="checkbox" checked={allOn} onChange={(e) => { setConfirmDelete(false); setSets(toggle(sets, ids, e.target.checked)); }} />
                        <h3>{lift.name}</h3>
                      </label>
                    ) : (
                      <h3><Link href={`/lift/${lift.exerciseId}`} className={styles.liftLink}>{lift.name} ›</Link></h3>
                    )}
                    <span className={styles.badges}>
                      {lift.pr && <span className={`${styles.badge} ${styles.pr}`}>PR</span>}
                      <span className={`${styles.badge} ${styles[lift.verdict]}`}>{VERDICT_LABEL[lift.verdict]}</span>
                    </span>
                  </div>

                  {editing ? (
                    <ul className={styles.setChips}>
                      {lift.sets.map((s, i) => (
                        <li key={s.id}>
                          <label className={`${styles.setChip} ${sets.has(s.id) ? styles.setOn : ""}`}>
                            <input type="checkbox" checked={sets.has(s.id)} onChange={(e) => { setConfirmDelete(false); setSets(toggle(sets, [s.id], e.target.checked)); }} />
                            Set {i + 1}: {s.text}
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <>
                      <p className={styles.sets}>{lift.summary} <span className={styles.vol}>· {lift.amount}</span></p>
                      {lift.pr && <p className={styles.prNote}>New record. {lift.pr}</p>}
                      <p className={styles.note}>{lift.note}{lift.last && <> · last time {lift.last}</>}</p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {cardio.length > 0 && (
        <section className={styles.section} aria-labelledby="cardio">
          <h2 id="cardio" className={styles.sub}>Cardio</h2>
          <ul className={styles.list}>
            {cardio.map((c) => (
              <li key={c.id} className={`${styles.lift} ${editing && runs.has(c.id) ? styles.selected : ""}`}>
                {editing ? (
                  <label className={styles.check}>
                    <input type="checkbox" checked={runs.has(c.id)} onChange={(e) => { setConfirmDelete(false); setRuns(toggle(runs, [c.id], e.target.checked)); }} />
                    <h3>{c.kind}</h3>
                  </label>
                ) : (
                  <h3>{c.kind}</h3>
                )}
                <p className={styles.sets}>{c.line}</p>
              </li>
            ))}
          </ul>
          {cardioTotal && <p className={styles.note}>{cardioTotal}</p>}
        </section>
      )}

      {editing && (
        <div className={styles.toolbar} role="region" aria-label="Edit selected entries">
          <div className={styles.toolRow}>
            <button
              type="button"
              className={styles.toolGhost}
              onClick={() => {
                const on = count < total;
                setConfirmDelete(false);
                setSets(on ? new Set(allSetIds) : new Set());
                setRuns(on ? new Set(cardio.map((c) => c.id)) : new Set());
              }}
            >
              {count < total ? "Select all" : "Clear"}
            </button>
            <span className={styles.toolCount} aria-live="polite">{count} selected</span>
          </div>
          <div className={styles.toolRow}>
            <label htmlFor="move-to" className="sr-only">Move to day</label>
            <input id="move-to" type="date" className={styles.toolDate} value={moveTo} min={min} max={today} onChange={(e) => { setMoveTo(e.target.value); setError(""); }} />
            <button type="button" className={styles.toolGhost} disabled={pending} onClick={onMove}>Move</button>
            <button type="button" className={`${styles.toolDanger} ${confirmDelete ? styles.toolDangerOn : ""}`} disabled={pending} onClick={onDelete}>
              {confirmDelete ? `Delete ${count}?` : "Delete"}
            </button>
          </div>
          {error && <p className={styles.toolError} role="alert">{error}</p>}
        </div>
      )}
    </>
  );
}
