"use client";
import SlideLink from "./SlideLink";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./BottomNav.module.css";

// Tab order sets the slide direction: moving right slides forward, left slides back.
const TABS = [
  { label: "Activity", path: "/activity", icon: <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4z" /> },
  { label: "Today", path: "/", icon: <path d="M12 2.5a3 3 0 110 6 3 3 0 010-6zM7 10.5h10l-1.2 6H13.5V21h-3v-4.5H8.2z" /> },
  { label: "Session", path: "/report", icon: <path d="M4 5h16v2.5H4zM4 10.75h16v2.5H4zM4 16.5h10v2.5H4z" /> },
];
// The lift and week pages live under Session.
const tabOf = (path: string) => (path.startsWith("/activity") ? 0 : path === "/" ? 1 : 2);

export default function BottomNav() {
  const path = usePathname();
  const day = useSearchParams().get("day");
  if (path === "/login") return null;
  const current = tabOf(path);

  return (
    <nav className={styles.bar} aria-label="Main" data-tabbar>
      {TABS.map((t, i) => {
        // Every tab follows the day you're looking at (Activity selects it on the calendar).
        const href = day ? `${t.path}?day=${day}` : t.path;
        return (
          <SlideLink
            key={t.path}
            href={href}
            className={`${styles.tab} ${i === current ? styles.on : ""}`}
            aria-current={i === current ? "page" : undefined}
            prefetch={true}
            slide={i === current ? undefined : i > current ? "forward" : "back"}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="currentColor">{t.icon}</svg>
            <span className="sr-only">{t.label}</span>
          </SlideLink>
        );
      })}
    </nav>
  );
}
