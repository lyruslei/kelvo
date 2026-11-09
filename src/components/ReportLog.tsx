"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
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

// The session as swipeable panels (Summary, Lifts, Cardio, Plan, This week): swipe left/right
// or tap a tab. Lifts and Cardio share an Edit mode to delete entries or move them to another day.
export default function ReportPanels({ summary, upNext, week, lifts, cardio, cardioTotal, day, today, min }: {
  summary: ReactNode;
  upNext: ReactNode | null;
  week: ReactNode;
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
  const stopEditing = () => { setSets(new Set()); setRuns(new Set()); setConfirmDelete(false); setError(""); setEditing(false); };

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

  const editButton = (
    <button type="button" className={styles.editToggle} onClick={() => (editing ? stopEditing() : setEditing(true))}>
      {editing ? "Done" : "Edit"}
    </button>
  );

  // ---- Panels ----
  // Order: Summary, Lifts, Cardio, Plan, This week.
  const panels: { id: string; label: string; body: ReactNode }[] = [{ id: "summary", label: "Summary", body: summary }];

  if (lifts.length) {
    panels.push({
      id: "lifts",
      label: "Lifts",
      body: (
        <>
          <div className={styles.panelHead}>
            <h2 className={styles.panelSub}>{editing ? "Select lifts or sets" : "Lifts vs last time"}</h2>
            {editButton}
          </div>
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
        </>
      ),
    });
  }

  if (cardio.length) {
    panels.push({
      id: "cardio",
      label: "Cardio",
      body: (
        <>
          <div className={styles.panelHead}>
            <h2 className={styles.panelSub}>{editing ? "Select sessions" : "Cardio"}</h2>
            {editButton}
          </div>
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
        </>
      ),
    });
  }

  if (upNext) panels.push({ id: "plan", label: "Plan", body: upNext });
  panels.push({ id: "week", label: "This week", body: week });

  // ---- Swiping ----
  const track = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [height, setHeight] = useState<number | undefined>(undefined);

  // The track takes the height of the panel on screen, so a short panel doesn't leave a gap.
  const fitHeight = useCallback(() => {
    const el = panelRefs.current[active];
    if (el) setHeight(el.offsetHeight);
  }, [active]);
  useEffect(() => {
    fitHeight();
    const el = panelRefs.current[active];
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fitHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active, fitHeight, editing, lifts, cardio]);

  const onScroll = () => {
    const t = track.current;
    if (!t) return;
    const i = Math.round(t.scrollLeft / t.clientWidth);
    if (i !== active) {
      setActive(i);
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById(`tab-${panels[i]?.id}`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  };
  const goTo = (i: number) => {
    const t = track.current;
    if (!t) return;
    t.scrollTo({ left: i * t.clientWidth, behavior: "smooth" });
  };
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" && i < panels.length - 1) goTo(i + 1);
    if (e.key === "ArrowLeft" && i > 0) goTo(i - 1);
  };

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Session sections">
        {panels.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`tab-${p.id}`}
            aria-selected={i === active}
            aria-controls={`panel-${p.id}`}
            tabIndex={i === active ? 0 : -1}
            className={`${styles.tab} ${i === active ? styles.tabOn : ""}`}
            onClick={() => goTo(i)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div ref={track} className={styles.track} style={{ height }} onScroll={onScroll}>
        {panels.map((p, i) => (
          <section
            key={p.id}
            ref={(el) => { panelRefs.current[i] = el; }}
            id={`panel-${p.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${p.id}`}
            aria-hidden={i !== active}
            inert={i !== active}
            className={styles.panel}
          >
            {p.body}
          </section>
        ))}
      </div>

      <p className={styles.swipeHint} aria-hidden="true">
        {active < panels.length - 1 ? `Swipe for ${panels[active + 1].label} ›` : "‹ Swipe back"}
      </p>

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
