import styles from "./Wordmark.module.css";

// Heavy lowercase "rumbi"; the dot on the i is a yellow circle (timbi's mark, in yellow).
export default function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`${styles.mark} ${styles[size]}`} aria-label="rumbi" role="img">
      rumb<span className={styles.i}>ı</span>
    </span>
  );
}
