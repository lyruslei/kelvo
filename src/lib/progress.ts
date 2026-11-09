// Compares a day's sets of a lift with earlier sessions of the same lift. Pure: no I/O.

export type SimpleSet = { reps: number | null; weight_kg: number; duration_s?: number | null };
export type Verdict = "up" | "same" | "down" | "first";

const kg = (n: number) => `${Number.isInteger(n) ? n : Number(n.toFixed(2))}kg`;
const secs = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s}s`);

const setText = ({ reps, weight_kg, duration_s }: SimpleSet) => {
  const amount = reps ? `${reps}` : duration_s ? secs(duration_s) : "?";
  const load = weight_kg > 0 ? ` @ ${kg(weight_kg)}` : reps ? " bodyweight" : "";
  return amount + load;
};
const same = (a: SimpleSet, b: SimpleSet) => a.reps === b.reps && a.weight_kg === b.weight_kg && (a.duration_s ?? null) === (b.duration_s ?? null);

// "3x10 @ 24kg, 8 @ 26kg" / "3x60s": runs of identical sets are grouped.
export function formatSets(sets: SimpleSet[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < sets.length) {
    let j = i;
    while (j + 1 < sets.length && same(sets[j + 1], sets[i])) j++;
    const n = j - i + 1;
    parts.push(`${n > 1 ? `${n}x` : ""}${setText(sets[i])}`);
    i = j + 1;
  }
  return parts.join(", ");
}

// Shortest form, weight said once: "3 × 12 @ 25kg", "10, 9, 8 @ 24kg", "8 @ 60kg · 6 @ 70kg", "3 × 60s".
export function compactSets(sets: SimpleSet[]): string {
  const groups: SimpleSet[][] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last[0].weight_kg === s.weight_kg && !!last[0].reps === !!s.reps) last.push(s);
    else groups.push([s]);
  }
  return groups
    .map((g) => {
      const amounts = g.map((s) => (s.reps ? `${s.reps}` : s.duration_s ? secs(s.duration_s) : "?"));
      const amount = g.length > 1 && amounts.every((a) => a === amounts[0]) ? `${g.length} × ${amounts[0]}` : amounts.join(", ");
      const load = g[0].weight_kg > 0 ? ` @ ${kg(g[0].weight_kg)}` : g[0].reps ? " bodyweight" : "";
      return amount + load;
    })
    .join(" · ");
}

export const volume = (sets: SimpleSet[]) => Math.round(sets.reduce((sum, s) => sum + (s.reps ?? 0) * s.weight_kg, 0));
export const totalReps = (sets: SimpleSet[]) => sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
export const totalSeconds = (sets: SimpleSet[]) => sets.reduce((sum, s) => sum + (s.duration_s ?? 0), 0);

// What a lift is measured by: weight (any set has kg and reps), reps (bodyweight), or time (holds).
type Kind = "weight" | "reps" | "time";
function kindOf(sets: SimpleSet[]): Kind {
  if (sets.some((s) => s.weight_kg > 0 && s.reps)) return "weight";
  if (sets.some((s) => s.reps)) return "reps";
  return "time";
}

const topWeight = (sets: SimpleSet[]) => Math.max(0, ...sets.filter((s) => s.reps).map((s) => s.weight_kg));
const repsAt = (sets: SimpleSet[], w: number) => Math.max(0, ...sets.filter((s) => s.weight_kg === w).map((s) => s.reps ?? 0));
const longestHold = (sets: SimpleSet[]) => Math.max(0, ...sets.map((s) => s.duration_s ?? 0));
const bestReps = (sets: SimpleSet[]) => Math.max(0, ...sets.map((s) => s.reps ?? 0));

const signed = (n: number, unit = "") => `${n > 0 ? "+" : ""}${n.toLocaleString()}${unit}`;
const repsWord = (n: number) => `${signed(n)} ${Math.abs(n) === 1 ? "rep" : "reps"}`;

// Weighted: heavier top set wins; same top weight, more reps at it; same top set, more volume.
// Bodyweight: total reps. Timed holds: total time.
// `change` is the short form for a badge: "+2.5kg", "+2 reps", "-30s", "Same", "New".
export function compare(today: SimpleSet[], last: SimpleSet[] | null): { verdict: Verdict; note: string; change: string } {
  if (!last?.length) return { verdict: "first", note: "First time logged", change: "New" };
  const kind = kindOf(today);

  if (kind === "time") {
    const d = totalSeconds(today) - totalSeconds(last);
    if (d === 0) return { verdict: "same", note: `Same ${secs(totalSeconds(today))} total`, change: "Same" };
    return { verdict: d > 0 ? "up" : "down", note: `${signed(d, "s")} total time`, change: signed(d, "s") };
  }
  if (kind === "reps" && topWeight(last) === 0) {
    const d = totalReps(today) - totalReps(last);
    if (d === 0) return { verdict: "same", note: `Same ${totalReps(today)} total reps`, change: "Same" };
    return { verdict: d > 0 ? "up" : "down", note: `${signed(d)} total reps`, change: repsWord(d) };
  }

  const tw = topWeight(today);
  const lw = topWeight(last);
  if (tw !== lw) {
    const d = signed(Number((tw - lw).toFixed(2)), "kg");
    return { verdict: tw > lw ? "up" : "down", note: `Top set ${d}`, change: d };
  }
  const tr = repsAt(today, tw);
  const lr = repsAt(last, lw);
  if (tr !== lr) return { verdict: tr > lr ? "up" : "down", note: `${signed(tr - lr)} reps @ ${kg(tw)}`, change: repsWord(tr - lr) };
  const dv = volume(today) - volume(last);
  if (dv === 0) return { verdict: "same", note: `Same top set, ${tr} @ ${kg(tw)}`, change: "Same" };
  return { verdict: dv > 0 ? "up" : "down", note: `Same top set, volume ${signed(dv, "kg")}`, change: `${signed(dv, "kg")} vol` };
}

// A personal record: better than every earlier session. Weighted: heavier than ever,
// or most reps ever at your heaviest weight. Bodyweight: most reps in a set. Timed: longest hold.
export function personalRecord(today: SimpleSet[], earlier: SimpleSet[][]): string | null {
  if (!earlier.length) return null; // the first session isn't a record yet
  const all = earlier.flat();
  const kind = kindOf(today);
  if (kind === "time") {
    const t = longestHold(today);
    return t > longestHold(all) ? `Longest hold: ${secs(t)}` : null;
  }
  if (kind === "reps" && topWeight(all) === 0) {
    const r = bestReps(today);
    return r > bestReps(all) ? `Most reps: ${r}` : null;
  }
  const tw = topWeight(today);
  const best = topWeight(all);
  if (tw > best) return `Heaviest: ${kg(tw)}`;
  if (tw === best && repsAt(today, tw) > repsAt(all, best)) return `Most reps at ${kg(tw)}: ${repsAt(today, tw)}`;
  return null;
}

// Your rep and set range. nextTarget plans inside it (double progression).
export const REP_RANGE = { min: 6, max: 9 };
export const SET_RANGE = { min: 2, max: 3 };

// What to do next session, from the last one: "24kg: 9, 9, 8 reps" or "26kg: 6+ reps x3 sets".
// Weighted: work off the top-weight sets. Every one at the top of the range: add a step
// (2kg per dumbbell, else 2.5kg) and start back at the bottom. Otherwise same weight, one
// more rep on each set still under the top. Bodyweight: one more rep a set. Holds: 5s more.
export function nextTarget(last: SimpleSet[], exercise: string): string {
  const kind = kindOf(last);
  if (kind === "time") return last.filter((s) => s.duration_s).map((s) => secs((s.duration_s ?? 0) + 5)).join(", ");
  if (kind === "reps") return `bodyweight: ${last.filter((s) => s.reps).map((s) => (s.reps ?? 0) + 1).join(", ")} reps`;

  const w = topWeight(last);
  const work = last.filter((s) => s.reps && s.weight_kg === w).map((s) => s.reps ?? 0);
  const n = Math.min(SET_RANGE.max, Math.max(SET_RANGE.min, work.length));
  const reps = Array.from({ length: n }, (_, i) => work[i] ?? work[work.length - 1]);
  if (reps.every((r) => r >= REP_RANGE.max)) {
    const step = /dumbbell/i.test(exercise) ? 2 : 2.5;
    return `${kg(w + step)}: ${REP_RANGE.min}+ reps x${n} sets`;
  }
  return `${kg(w)}: ${reps.map((r) => Math.min(REP_RANGE.max, r + 1)).join(", ")} reps`;
}

// The heaviest set of a session (for the lift history chart): weight, reps at it.
export function topSet(sets: SimpleSet[]): { weight_kg: number; reps: number; duration_s: number } {
  const w = topWeight(sets);
  return { weight_kg: w, reps: repsAt(sets, w), duration_s: longestHold(sets) };
}
