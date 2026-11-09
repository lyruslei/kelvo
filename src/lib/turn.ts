// Checks and cleans what Claude returns before anything is saved. Pure: no I/O.
import { MUSCLES, computeGlow, type GlowMap, type Muscle } from "./muscles.ts";

// A set has reps, a duration (timed holds like a plank), or both.
export type LiftSet = { reps: number | null; weight_kg: number; duration_s: number | null };
export type Lift = { exercise: string; primary: Muscle[]; secondary: Muscle[]; sets: LiftSet[] };
export type Cardio = {
  kind: string;
  minutes: number;
  distance_km: number | null;
  speed_kmh: number | null;
  incline_pct: number | null;
};
export type Turn = {
  lifts: Lift[];
  cardio: Cardio[];
  removeSetIds: number[]; // corrections and "remove the ..." (only ids shown to Claude)
  removeCardioIds: number[];
  logDay: string | null; // "yesterday I ..." -> that date (checked again by the server)
  restDay: "set" | "clear" | null; // "rest day today" / "actually I'm training today"
  reply: string;
};
export type Library = Map<string, { primary: Muscle[]; secondary: Muscle[] }>;
export type AllowedIds = { sets: Set<number>; cardio: Set<number> };

const MUSCLE_SET = new Set<string>(MUSCLES);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
const inRange = (v: unknown, min: number, max: number): number | null => (isNum(v) && v >= min && v <= max ? v : null);

export const canonicalName = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// ---- Typo-tolerant exercise names ----

// Edit distance counting a swap of two neighbouring letters as one typo ("pulldwon").
export function typoDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Typos allowed in one word. Short words must match exactly, so "hack" never becomes "back".
const wordBudget = (len: number) => (len <= 4 ? 0 : len <= 7 ? 1 : 2);
const stem = (w: string) => (w.length > 2 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w); // "lunges" = "lunge"
const wordDistance = (a: string, b: string) => Math.min(typoDistance(a, b), typoDistance(stem(a), stem(b)));

// How many typos away `name` is from `known`, or null if it's too far to be a typo.
function typosAway(name: string, known: string): number | null {
  const a = name.split(" "), b = known.split(" ");
  if (a.length === b.length) {
    let total = 0;
    for (let i = 0; i < a.length; i++) {
      const dist = wordDistance(a[i], b[i]);
      if (dist > wordBudget(Math.max(a[i].length, b[i].length))) return null;
      total += dist;
    }
    return total;
  }
  // Spacing differences: "pullups" = "pull up".
  const ja = a.map(stem).join(""), jb = b.map(stem).join("");
  const dist = typoDistance(ja, jb);
  return dist <= (ja.length >= 6 ? 1 : 0) ? dist : null;
}

// A misspelled library exercise ("dumbel curl") becomes the library one ("dumbbell curl"),
// so typos don't create duplicate exercises. Anything else is left as it is.
export function snapToLibrary(name: string, library: Library): string {
  if (library.has(name)) return name;
  let best: string | null = null, bestDist = Infinity, tie = false;
  for (const known of library.keys()) {
    const dist = typosAway(name, known);
    if (dist === null) continue;
    if (dist < bestDist) [best, bestDist, tie] = [known, dist, false];
    else if (dist === bestDist) tie = true;
  }
  return best && !tie ? best : name;
}

const muscles = (v: unknown): Muscle[] =>
  Array.isArray(v) ? [...new Set(v.filter((m): m is Muscle => typeof m === "string" && MUSCLE_SET.has(m)))] : [];

function cleanLift(raw: unknown, library: Library): Lift | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const exercise = typeof r.exercise === "string" ? snapToLibrary(canonicalName(r.exercise), library) : "";
  if (!exercise || exercise.length > 80) return null;

  const sets: LiftSet[] = [];
  for (const s of Array.isArray(r.sets) ? r.sets : []) {
    const o = (s ?? {}) as Record<string, unknown>;
    const reps = inRange(o.reps, 1, 1000);
    const secs = inRange(o.duration_s, 1, 36000);
    const kg = inRange(o.weight_kg ?? 0, 0, 1000);
    if ((reps === null && secs === null) || kg === null) continue;
    sets.push({ reps: reps === null ? null : Math.round(reps), weight_kg: round(kg, 2), duration_s: secs === null ? null : Math.round(secs) });
  }
  if (!sets.length || sets.length > 50) return null;

  // A known exercise always keeps its library muscles, whatever Claude said.
  const known = library.get(exercise);
  const primary = known?.primary ?? muscles(r.primary);
  const secondary = (known?.secondary ?? muscles(r.secondary)).filter((m) => !primary.includes(m));
  if (!primary.length) return null;
  return { exercise, primary, secondary, sets };
}

function cleanCardio(raw: unknown): Cardio | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = typeof r.kind === "string" ? canonicalName(r.kind) : "";
  const minutes = inRange(r.minutes, 0.1, 1440);
  if (!kind || kind.length > 40 || minutes === null) return null;
  const speed = inRange(r.speed_kmh, 0.1, 60);
  const incline = inRange(r.incline_pct, -10, 40);
  // Distance as given, else worked out from time and speed.
  const given = inRange(r.distance_km, 0.01, 500);
  const distance = given ?? (speed !== null ? round((minutes / 60) * speed, 2) : null);
  return { kind, minutes: round(minutes, 1), distance_km: distance, speed_kmh: speed, incline_pct: incline };
}

const ids = (v: unknown, allowed: Set<number>): number[] =>
  Array.isArray(v) ? [...new Set(v.filter((n): n is number => Number.isInteger(n) && allowed.has(n)))] : [];

export function normalizeTurn(raw: unknown, library: Library, allowed: AllowedIds = { sets: new Set(), cardio: new Set() }): Turn {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lifts = (Array.isArray(r.lifts) ? r.lifts : []).map((l) => cleanLift(l, library)).filter((l): l is Lift => !!l);
  const cardio = (Array.isArray(r.cardio) ? r.cardio : []).map(cleanCardio).filter((c): c is Cardio => !!c);
  const logDay = typeof r.log_day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.log_day) ? r.log_day : null;
  const reply = typeof r.reply === "string" && r.reply.trim() ? r.reply.trim().slice(0, 1000) : "Got it.";
  return {
    lifts,
    cardio,
    removeSetIds: ids(r.remove_set_ids, allowed.sets),
    removeCardioIds: ids(r.remove_cardio_ids, allowed.cardio),
    logDay,
    restDay: r.rest_day === "set" || r.rest_day === "clear" ? r.rest_day : null,
    reply,
  };
}

// ---- A day's numbers, from saved rows ----

export type SetRow = {
  reps: number | null;
  weight_kg: number;
  duration_s?: number | null;
  exercise: { name: string; primary_muscles: Muscle[]; secondary_muscles: Muscle[] };
};
export type CardioRow = { kind: string; minutes: number; distance_km: number | null; speed_kmh?: number | null; incline_pct?: number | null };
export type DaySummary = { glow: GlowMap; volumeKg: number; sets: number; cardioMin: number; cardioKm: number };

export function summarizeDay(sets: SetRow[], cardio: CardioRow[]): DaySummary {
  const byExercise = new Map<string, SetRow["exercise"]>();
  for (const s of sets) byExercise.set(s.exercise.name, s.exercise);
  const glow = computeGlow([...byExercise.values()].map((e) => ({ primary: e.primary_muscles, secondary: e.secondary_muscles })));
  return {
    glow,
    volumeKg: Math.round(sets.reduce((sum, s) => sum + (s.reps ?? 0) * s.weight_kg, 0)),
    sets: sets.length,
    cardioMin: Math.round(cardio.reduce((sum, c) => sum + c.minutes, 0)),
    cardioKm: round(cardio.reduce((sum, c) => sum + (c.distance_km ?? 0), 0), 2),
  };
}

// Running pace, e.g. 5 km in 28 min -> "5:36 /km". Null without a distance.
export function pace(minutes: number, distanceKm: number | null): string | null {
  if (!distanceKm || distanceKm <= 0 || minutes <= 0) return null;
  const secsPerKm = Math.round((minutes * 60) / distanceKm);
  return `${Math.floor(secsPerKm / 60)}:${String(secsPerKm % 60).padStart(2, "0")} /km`;
}
