import styles from "./Wordmark.module.css";

// Heavy lowercase "kelvo"; the o is a yellow ring (the same ring is the app icon).
export default function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`${styles.mark} ${styles[size]}`} aria-label="kelvo" role="img">
      kelv<span className={styles.o} aria-hidden="true" />
    </span>
  );
}
