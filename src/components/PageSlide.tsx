import { ViewTransition, type ReactNode } from "react";

// Slides a page in or out when the navigation is tagged nav-forward / nav-back (see BottomNav).
// Untagged navigations (browser back, refresh) don't animate.
const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

export default function PageSlide({ children }: { children: ReactNode }) {
  return <ViewTransition enter={SLIDE} exit={SLIDE} default="none">{children}</ViewTransition>;
}
