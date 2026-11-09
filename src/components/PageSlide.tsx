"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { takeSlide } from "./SlideLink";

// Slides the page in when it's shown after a SlideLink tap. Runs on every show, including when
// Next.js reveals a page it kept in memory (React re-runs effects then), which the View Transitions
// API skipped on phones after the first visit. Plain element.animate(), so every browser plays it.
export default function PageSlide({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const dir = takeSlide();
    if (!dir || !ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current.animate(
      [{ opacity: 0, transform: `translateX(${dir === "forward" ? 40 : -40}px)` }, { opacity: 1, transform: "none" }],
      { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, []);
  return <div ref={ref}>{children}</div>;
}
