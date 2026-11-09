// Checks and cleans what Claude returns before anything is saved. Pure: no I/O.
import { MUSCLES, computeGlow, type GlowMap, type Muscle } from "./muscles.ts";

export type LiftSet = { reps: number; weight_kg: number };
export type Lift = { exercise: string; primary: Muscle[]; secondary: Muscle[]; sets: LiftSet[] };
export type Cardio = {
  kind: string;
  minutes: number;
  distance_km: number | null;
  speed_kmh: number | null;
  incline_pct: number | null;
};
export type Turn = { lifts: Lift[]; cardio: Cardio[]; reply: string };
export type Library = Map<string, { primary: Muscle[]; secondary: Muscle[] }>;

const MUSCLE_SET = new Set<string>(MUSCLES);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
const inRange = (v: unknown, min: number, max: number): number | null => (isNum(v) && v >= min && v <= max ? v : null);

export const canonicalName = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const muscles = (v: unknown): Muscle[] =>
  Array.isArray(v) ? [...new Set(v.filter((m): m is Muscle => typeof m === "string" && MUSCLE_SET.has(m)))] : [];

function cleanLift(raw: unknown, library: Library): Lift | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const exercise = typeof r.exercise === "string" ? canonicalName(r.exercise) : "";
  if (!exercise || exercise.length > 80) return null;

  const sets: LiftSet[] = [];
  for (const s of Array.isArray(r.sets) ? r.sets : []) {
    const reps = inRange((s as LiftSet)?.reps, 1, 1000);
    const kg = inRange((s as LiftSet)?.weight_kg, 0, 1000);
    if (reps === null || kg === null) continue;
    sets.push({ reps: Math.round(reps), weight_kg: round(kg, 2) });
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

export function normalizeTurn(raw: unknown, library: Library): Turn {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lifts = (Array.isArray(r.lifts) ? r.lifts : []).map((l) => cleanLift(l, library)).filter((l): l is Lift => !!l);
  const cardio = (Array.isArray(r.cardio) ? r.cardio : []).map(cleanCardio).filter((c): c is Cardio => !!c);
  const reply = typeof r.reply === "string" && r.reply.trim() ? r.reply.trim().slice(0, 1000) : "Got it.";
  return { lifts, cardio, reply };
}

// ---- Today's numbers, from saved rows ----

export type SetRow = { reps: number; weight_kg: number; exercise: { name: string; primary_muscles: Muscle[]; secondary_muscles: Muscle[] } };
export type CardioRow = { kind: string; minutes: number; distance_km: number | null; speed_kmh?: number | null; incline_pct?: number | null };
export type DaySummary = { glow: GlowMap; volumeKg: number; sets: number; cardioMin: number; cardioKm: number };

export function summarizeDay(sets: SetRow[], cardio: CardioRow[]): DaySummary {
  const byExercise = new Map<string, SetRow["exercise"]>();
  for (const s of sets) byExercise.set(s.exercise.name, s.exercise);
  const glow = computeGlow([...byExercise.values()].map((e) => ({ primary: e.primary_muscles, secondary: e.secondary_muscles })));
  return {
    glow,
    volumeKg: Math.round(sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0)),
    sets: sets.length,
    cardioMin: Math.round(cardio.reduce((sum, c) => sum + c.minutes, 0)),
    cardioKm: round(cardio.reduce((sum, c) => sum + (c.distance_km ?? 0), 0), 2),
  };
}
