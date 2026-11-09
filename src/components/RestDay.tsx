import styles from "./RestDay.module.css";

// Shown in place of the body map on a rest day: a person asleep in bed. Original drawing.
export default function RestDay() {
  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 400 240" className={styles.art} role="img" aria-label="Rest day: someone asleep in bed">
        {/* bed frame */}
        <rect x="40" y="96" width="16" height="118" rx="6" fill="var(--body-gap)" />
        <rect x="344" y="140" width="16" height="74" rx="6" fill="var(--body-gap)" />
        <rect x="40" y="168" width="320" height="22" rx="6" fill="var(--body-gap)" />
        {/* mattress */}
        <rect x="56" y="148" width="288" height="24" rx="8" fill="var(--idle)" />
        {/* pillow */}
        <rect x="62" y="118" width="74" height="32" rx="14" fill="var(--yellow-pale)" opacity="0.85" />
        {/* head */}
        <circle cx="104" cy="114" r="20" fill="var(--body-gap)" />
        {/* blanket over the body */}
        <path d="M120 128 Q160 104 214 112 Q272 118 312 122 Q338 126 340 150 L120 150 Z" fill="var(--yellow)" />
        <path d="M120 128 Q140 120 150 124 L150 150 L120 150 Z" fill="var(--yellow-deep)" />
        {/* feet bump */}
        <ellipse cx="322" cy="124" rx="16" ry="10" fill="var(--yellow)" />
      </svg>
      <span className={styles.z} aria-hidden="true">
        <span>z</span><span>z</span><span>Z</span>
      </span>
    </div>
  );
}
