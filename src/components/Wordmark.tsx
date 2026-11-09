import { markSegments, MARK } from "./logoMark";
import styles from "./Wordmark.module.css";

// Heavy lowercase "kelvo"; the o is the 6-segment ring (the same ring is the app icon).
export default function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`${styles.mark} ${styles[size]}`} aria-label="kelvo" role="img">
      kelv
      <svg className={styles.o} viewBox="0 0 100 100" aria-hidden="true">
        {markSegments().map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={MARK.stroke} />
        ))}
      </svg>
    </span>
  );
}
