"use client";
import Link from "next/link";
import type { ComponentProps } from "react";

export type Slide = "forward" | "back";

// The direction of the navigation in flight, picked up by the page that shows next (PageSlide).
let pending: { dir: Slide; at: number } | null = null;
export function takeSlide(): Slide | null {
  const p = pending;
  pending = null;
  return p && Date.now() - p.at < 3000 ? p.dir : null; // a stale tap (no navigation followed) doesn't animate later
}

// A Link whose destination page slides in from the right (forward) or left (back).
export default function SlideLink({ slide, onClick, ...props }: ComponentProps<typeof Link> & { slide?: Slide }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        if (slide) pending = { dir: slide, at: Date.now() };
        onClick?.(e);
      }}
    />
  );
}
