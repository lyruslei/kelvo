import { MUSCLE_LABELS, type GlowMap, type Muscle } from "@/lib/muscles";
import { BACK, DECOR_BACK, DECOR_FRONT, FRONT, HEAD, SILHOUETTE } from "./bodyPaths";
import styles from "./BodyMap.module.css";

const MIRROR = "matrix(-1 0 0 1 200 0)";

function Figure({ shapes, decor, glow, label }: { shapes: typeof FRONT; decor: string[]; glow: GlowMap; label: string }) {
  const cls = (m: Muscle) => `${styles.muscle} ${glow[m] === "full" ? styles.full : glow[m] === "soft" ? styles.soft : ""}`;
  return (
    <svg viewBox="0 0 200 440" className={styles.figure} role="img" aria-label={label}>
      <ellipse {...HEAD} className={styles.body} />
      <path d={SILHOUETTE} className={styles.body} />
      <path d={SILHOUETTE} className={styles.body} transform={MIRROR} />
      {decor.map((d, i) => (
        <g key={`d${i}`} className={styles.muscle}>
          <path d={d} />
          <path d={d} transform={MIRROR} />
        </g>
      ))}
      {shapes.map((s, i) => (
        <g key={i} className={cls(s.muscle)} data-muscle={s.muscle}>
          <path d={s.d} />
          <path d={s.d} transform={MIRROR} />
        </g>
      ))}
    </svg>
  );
}

export default function BodyMap({ glow }: { glow: GlowMap }) {
  const worked = (Object.keys(glow) as Muscle[]);
  const full = worked.filter((m) => glow[m] === "full").map((m) => MUSCLE_LABELS[m]);
  const soft = worked.filter((m) => glow[m] === "soft").map((m) => MUSCLE_LABELS[m]);
  const summary = worked.length
    ? `Worked today: ${full.join(", ") || "none"}. Lightly: ${soft.join(", ") || "none"}.`
    : "No muscles worked yet today.";

  return (
    <div className={styles.map}>
      <p className="sr-only">{summary}</p>
      <Figure shapes={FRONT} decor={DECOR_FRONT} glow={glow} label="Body, front" />
      <Figure shapes={BACK} decor={DECOR_BACK} glow={glow} label="Body, back" />
    </div>
  );
}
