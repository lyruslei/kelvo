import "server-only";
import { db } from "./supabase";
import { computeGlow, type Muscle } from "./muscles";
import { addDays } from "./days";
import { groupsHit, type History } from "./schedule";
import type { CardioRow, Library, SetRow, Turn } from "./turn";

export type Message = { role: "user" | "bot"; text: string };

function check<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

export async function loadLibrary(): Promise<Library> {
  const rows = check(
    await db().from("exercises").select("name, primary_muscles, secondary_muscles"),
    "load exercises",
  ) as { name: string; primary_muscles: Muscle[]; secondary_muscles: Muscle[] }[];
  return new Map(rows.map((r) => [r.name, { primary: r.primary_muscles, secondary: r.secondary_muscles }]));
}

export type DaySet = SetRow & { set_no: number; exercise_id: number };

export async function loadDay(day: string): Promise<{ sets: DaySet[]; cardio: CardioRow[]; messages: Message[] }> {
  const [sets, cardio, messages] = await Promise.all([
    db().from("lift_sets").select("exercise_id, set_no, reps, weight_kg, exercise:exercises(name, primary_muscles, secondary_muscles)").eq("day", day).order("id"),
    db().from("cardio_sessions").select("kind, minutes, distance_km, speed_kmh, incline_pct").eq("day", day).order("id"),
    db().from("messages").select("role, text").eq("day", day).order("id"),
  ]);
  return {
    sets: check(sets, "load sets") as unknown as DaySet[],
    cardio: check(cardio, "load cardio") as CardioRow[],
    messages: check(messages, "load messages") as Message[],
  };
}

// Groups hit (full glow) on each of the last `days` days up to and including `day`.
export async function loadHistory(day: string, days = 60): Promise<History> {
  const rows = check(
    await db()
      .from("lift_sets")
      .select("day, exercise:exercises(primary_muscles, secondary_muscles)")
      .gte("day", addDays(day, -days))
      .lte("day", day)
      .limit(5000),
    "load history",
  ) as unknown as { day: string; exercise: { primary_muscles: Muscle[]; secondary_muscles: Muscle[] } }[];

  const byDay = new Map<string, { primary: Muscle[]; secondary: Muscle[] }[]>();
  for (const r of rows) {
    const list = byDay.get(r.day) ?? [];
    list.push({ primary: r.exercise.primary_muscles, secondary: r.exercise.secondary_muscles });
    byDay.set(r.day, list);
  }
  return new Map([...byDay].map(([d, ex]) => [d, groupsHit(computeGlow(ex))]));
}

// For each exercise, its most recent session before `day` (the sets in order, and the date).
export async function loadLastSessions(
  exerciseIds: number[],
  day: string,
): Promise<Map<number, { day: string; sets: { reps: number; weight_kg: number }[] }>> {
  const out = new Map<number, { day: string; sets: { reps: number; weight_kg: number }[] }>();
  if (!exerciseIds.length) return out;
  const rows = check(
    await db()
      .from("lift_sets")
      .select("exercise_id, day, reps, weight_kg")
      .in("exercise_id", exerciseIds)
      .lt("day", day)
      .order("day", { ascending: false })
      .order("set_no")
      .limit(2000),
    "load last sessions",
  ) as { exercise_id: number; day: string; reps: number; weight_kg: number }[];
  for (const r of rows) {
    const cur = out.get(r.exercise_id);
    if (!cur) out.set(r.exercise_id, { day: r.day, sets: [{ reps: r.reps, weight_kg: r.weight_kg }] });
    else if (cur.day === r.day) cur.sets.push({ reps: r.reps, weight_kg: r.weight_kg });
  }
  return out;
}

export async function saveTurn(day: string, turn: Turn, userText: string): Promise<void> {
  check(
    await db().rpc("log_turn", {
      p_day: day,
      p_lifts: turn.lifts,
      p_cardio: turn.cardio,
      p_messages: [
        { role: "user", text: userText },
        { role: "bot", text: turn.reply },
      ],
    }),
    "save turn",
  );
}

// Plain-text log of the day, for Claude's context.
export function describeDay(sets: DaySet[], cardio: CardioRow[]): string {
  const byExercise = new Map<string, string[]>();
  for (const s of sets) {
    const list = byExercise.get(s.exercise.name) ?? [];
    list.push(`${s.reps}x${s.weight_kg}kg`);
    byExercise.set(s.exercise.name, list);
  }
  const lifts = [...byExercise].map(([name, list]) => `${name}: ${list.join(", ")}`);
  const runs = cardio.map((c) => `${c.kind} ${c.minutes} min${c.distance_km ? `, ${c.distance_km} km` : ""}`);
  return [...lifts, ...runs].join("; ");
}
