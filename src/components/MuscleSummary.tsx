"use client";
import { useState } from "react";
import styles from "@/app/report/report.module.css";

export type MuscleView = { key: string; label: string; sets: number };
export type SummaryLift = { name: string; sets: string; primary: string[]; secondary: string[] };

// Muscles worked, split into main target and also worked (assisted), and the day's lifts.
// Tap a muscle to list only the lifts that worked it; tap it again to list every lift.
export default function MuscleSummary({ main, helped, lifts }: { main: MuscleView[]; helped: MuscleView[]; lifts: SummaryLift[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const label = [...main, ...helped].find((m) => m.key === picked)?.label;

  const shown = picked
    ? lifts
        .filter((l) => l.primary.includes(picked) || l.secondary.includes(picked))
        .sort((a, b) => Number(b.primary.includes(picked)) - Number(a.primary.includes(picked)))
    : lifts;

  const chip = (m: MuscleView, size: "main" | "helped") => (
    <li key={m.key}>
      <button
        type="button"
        className={`${styles.muscle} ${size === "main" ? styles.muscleMain : styles.muscleHelped} ${picked === m.key ? styles.musclePicked : ""}`}
        aria-pressed={picked === m.key}
        onClick={() => setPicked(picked === m.key ? null : m.key)}
      >
        {m.label}
        <span className={styles.muscleSets}>{m.sets} {m.sets === 1 ? "set" : "sets"}</span>
      </button>
    </li>
  );

  return (
    <>
      {main.length + helped.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.panelSub}>Muscles worked</h2>
          {main.length > 0 && (
            <>
              <h3 className={styles.roleLabel}>Main target</h3>
              <ul className={styles.muscles}>{main.map((m) => chip(m, "main"))}</ul>
            </>
          )}
          {helped.length > 0 && (
            <>
              <h3 className={styles.roleLabel}>Also worked</h3>
              <ul className={styles.muscles}>{helped.map((m) => chip(m, "helped"))}</ul>
            </>
          )}
        </div>
      )}

      {lifts.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.panelSub}>{label ? `${label} lifts` : "Lifts"}</h2>
          <ul className={styles.summaryLifts}>
            {shown.map((l) => (
              <li key={l.name}>
                <span className={styles.summaryName}>
                  {l.name}
                  {picked && !l.primary.includes(picked) && <span className={styles.helpedTag}>also worked</span>}
                </span>
                <span className={styles.summarySets}>{l.sets}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>{picked ? `Tap ${label} again to see every lift.` : "Tap a muscle to see only its lifts."}</p>
        </div>
      )}
    </>
  );
}
