// Split-free planning: which muscle groups are due next, and when you've earned a rest day. Pure: no I/O.
import type { GlowMap, Muscle } from "./muscles.ts";
import { addDays, relativeDay } from "./days.ts";

export const GROUPS = ["chest", "back", "shoulders", "arms", "legs", "abs"] as const;
export type Group = (typeof GROUPS)[number];

export const GROUP_LABELS: Record<Group, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms", legs: "Legs", abs: "Abs",
};

// A group counts as hit on a day when one of these muscles got full glow (soft glow doesn't count).
const KEY_MUSCLES: Record<Group, Muscle[]> = {
  chest: ["chest"],
  back: ["lats", "upper_back"],
  shoulders: ["front_delts", "side_delts", "rear_delts"],
  arms: ["biceps", "triceps"],
  legs: ["quads", "hamstrings", "glutes"],
  abs: ["abs", "obliques"],
};

export const REST_WINDOW_DAYS = 3;
const PER_DAY = 2;
const MIN_DAYS_BETWEEN = 2; // trained Monday -> earliest again Wednesday

export function groupsHit(glow: GlowMap): Set<Group> {
  return new Set(GROUPS.filter((g) => KEY_MUSCLES[g].some((m) => glow[m] === "full")));
}

// History: day (YYYY-MM-DD) -> groups hit that day. Days with no lifts can be missing.
export type History = Map<string, Set<Group>>;

const hitWithin = (history: History, endDay: string, days: number): Set<Group> => {
  const out = new Set<Group>();
  for (let i = 0; i < days; i++) for (const g of history.get(addDays(endDay, -i)) ?? []) out.add(g);
  return out;
};

// `day` is a rest day when yesterday finished a full round: every group got a full
// session in the 3 days up to and including yesterday, and yesterday was a training day.
// (So a rest day never repeats off the same round.)
export function isRestDay(day: string, history: History): boolean {
  const yesterday = addDays(day, -1);
  if (!history.get(yesterday)?.size) return false;
  return hitWithin(history, yesterday, REST_WINDOW_DAYS).size === GROUPS.length;
}

export type PlanDay = { day: string; rest: boolean; groups: Group[] };

// The next `count` days, starting tomorrow if you've trained today, else today.
// Each training day takes the groups rested longest; ties follow GROUPS order.
export function suggestNext(today: string, history: History, count = 3): PlanDay[] {
  const sim: History = new Map([...history].map(([d, g]) => [d, new Set(g)]));
  const start = sim.get(today)?.size ? addDays(today, 1) : today;
  const plan: PlanDay[] = [];

  for (let i = 0; i < count; i++) {
    const day = addDays(start, i);
    if (isRestDay(day, sim)) {
      plan.push({ day, rest: true, groups: [] });
      continue;
    }
    const lastHit = (g: Group) => {
      for (let back = 1; back <= 60; back++) if (sim.get(addDays(day, -back))?.has(g)) return back;
      return Infinity; // not in the last 60 days
    };
    // A group trained the day before needs a day off first, so it's never picked.
    const picks = [...GROUPS]
      .map((g, order) => ({ g, ago: lastHit(g), order }))
      .filter((x) => x.ago >= MIN_DAYS_BETWEEN)
      .sort((a, b) => b.ago - a.ago || a.order - b.order)
      .slice(0, PER_DAY)
      .map((x) => x.g)
      .sort((a, b) => GROUPS.indexOf(a) - GROUPS.indexOf(b));
    if (!picks.length) {
      plan.push({ day, rest: true, groups: [] }); // everything was trained yesterday
      continue;
    }
    plan.push({ day, rest: false, groups: picks });
    sim.set(day, new Set(picks));
  }
  return plan;
}

export const describePlan = (plan: PlanDay[], today: string) =>
  plan.map((p) => `${relativeDay(p.day, today)}: ${p.rest ? "rest day" : p.groups.map((g) => GROUP_LABELS[g]).join(" + ")}`).join("; ");
