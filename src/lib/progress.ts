// Compares today's sets of a lift with the last session of the same lift. Pure: no I/O.

export type SimpleSet = { reps: number; weight_kg: number };
export type Verdict = "up" | "same" | "down" | "first";

const kg = (n: number) => `${Number.isInteger(n) ? n : Number(n.toFixed(2))}kg`;

// "3x10 @ 24kg, 8 @ 26kg": runs of identical sets are grouped.
export function formatSets(sets: SimpleSet[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < sets.length) {
    let j = i;
    while (j + 1 < sets.length && sets[j + 1].reps === sets[i].reps && sets[j + 1].weight_kg === sets[i].weight_kg) j++;
    const n = j - i + 1;
    const { reps, weight_kg } = sets[i];
    const load = weight_kg > 0 ? ` @ ${kg(weight_kg)}` : " bodyweight";
    parts.push(`${n > 1 ? `${n}x` : ""}${reps}${load}`);
    i = j + 1;
  }
  return parts.join(", ");
}

const topWeight = (sets: SimpleSet[]) => Math.max(...sets.map((s) => s.weight_kg));
const repsAt = (sets: SimpleSet[], w: number) => Math.max(...sets.filter((s) => s.weight_kg === w).map((s) => s.reps));
export const volume = (sets: SimpleSet[]) => Math.round(sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0));

// Heavier top set wins. Same top weight: more reps at it wins. Same top set: more volume wins.
// Bodyweight lifts (all 0kg): total reps decides.
export function compare(today: SimpleSet[], last: SimpleSet[] | null): { verdict: Verdict; note: string } {
  if (!last?.length) return { verdict: "first", note: "First time logged" };
  const tw = topWeight(today);
  const lw = topWeight(last);

  if (tw === 0 && lw === 0) {
    const tr = today.reduce((s, x) => s + x.reps, 0);
    const lr = last.reduce((s, x) => s + x.reps, 0);
    if (tr === lr) return { verdict: "same", note: `Same ${tr} total reps` };
    return { verdict: tr > lr ? "up" : "down", note: `${tr > lr ? "+" : ""}${tr - lr} total reps` };
  }
  if (tw !== lw) {
    const diff = Number((tw - lw).toFixed(2));
    return { verdict: tw > lw ? "up" : "down", note: `Top set ${diff > 0 ? "+" : ""}${kg(diff)}` };
  }
  const tr = repsAt(today, tw);
  const lr = repsAt(last, lw);
  if (tr === lr) {
    // Same top set: total volume breaks the tie.
    const dv = volume(today) - volume(last);
    if (dv === 0) return { verdict: "same", note: `Same top set, ${tr} @ ${kg(tw)}` };
    return { verdict: dv > 0 ? "up" : "down", note: `Same top set, volume ${dv > 0 ? "+" : ""}${dv.toLocaleString()}kg` };
  }
  return { verdict: tr > lr ? "up" : "down", note: `${tr > lr ? "+" : ""}${tr - lr} reps @ ${kg(tw)}` };
}
