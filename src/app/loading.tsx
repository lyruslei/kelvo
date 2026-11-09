import styles from "./loading.module.css";

// Shown the instant you tap a tab (it's prefetched with the page's shell); the real page streams in after.
export default function Loading() {
  return (
    <div className={styles.shell} role="status" aria-label="Loading">
      <div className={styles.title} />
      <div className={styles.card} />
      <div className={styles.row}><div className={styles.tile} /><div className={styles.tile} /></div>
      <div className={styles.card} />
    </div>
  );
}
