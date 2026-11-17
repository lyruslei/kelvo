import "server-only";
import { db } from "./supabase";
import { computeGlow, type Muscle } from "./muscles";
import { addDays, niceDate } from "./days";
import { groupsHit, type History } from "./schedule";
import { compactSets, formatSets, nextTarget, type SimpleSet } from "./progress";
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

export type DaySet = SetRow & { id: number; set_no: number; exercise_id: number; duration_s: number | null };
export type DayCardio = CardioRow & { id: number };

const SET_COLUMNS = "id, exercise_id, set_no, reps, weight_kg, duration_s, exercise:exercises(name, primary_muscles, secondary_muscles)";

export async function loadDay(day: string): Promise<{ sets: DaySet[]; cardio: DayCardio[]; messages: Message[]; rest: boolean }> {
  const [sets, cardio, messages, rest] = await Promise.all([
    db().from("lift_sets").select(SET_COLUMNS).eq("day", day).order("id"),
    db().from("cardio_sessions").select("id, kind, minutes, distance_km, speed_kmh, incline_pct").eq("day", day).order("id"),
    db().from("messages").select("role, text").eq("day", day).order("id"),
    db().from("rest_days").select("day").eq("day", day).maybeSingle(),
  ]);
  return {
    sets: check(sets, "load sets") as unknown as DaySet[],
    cardio: check(cardio, "load cardio") as DayCardio[],
    messages: check(messages, "load messages") as Message[],
    rest: !!check(rest, "load rest day"),
  };
}

// Rest days you chose ("rest day today") from `fromDay` to `toDay`, inclusive.
export async function loadRestDays(fromDay: string, toDay: string): Promise<Set<string>> {
  const rows = check(
    await db().from("rest_days").select("day").gte("day", fromDay).lte("day", toDay),
    "load rest days",
  ) as { day: string }[];
  return new Set(rows.map((r) => r.day));
}

export async function countSets(day: string): Promise<number> {
  const r = await db().from("lift_sets").select("id", { count: "exact", head: true }).eq("day", day);
  if (r.error) throw new Error(`count sets: ${r.error.message}`);
  return r.count ?? 0;
}

export async function setRestDay(day: string, rest: boolean): Promise<void> {
  if (rest) check(await db().from("rest_days").upsert({ day }, { onConflict: "day", ignoreDuplicates: true }), "save rest day");
  else check(await db().from("rest_days").delete().eq("day", day), "clear rest day");
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

export type Session = { day: string; sets: SimpleSet[] };

// Every session of each exercise before `beforeDay` (or all, if omitted), newest first.
export async function loadSessions(exerciseIds: number[], beforeDay?: string): Promise<Map<number, Session[]>> {
  const out = new Map<number, Session[]>();
  if (!exerciseIds.length) return out;
  let q = db().from("lift_sets").select("exercise_id, day, reps, weight_kg, duration_s").in("exercise_id", exerciseIds);
  if (beforeDay) q = q.lt("day", beforeDay);
  const rows = check(
    await q.order("day", { ascending: false }).order("set_no").limit(5000),
    "load sessions",
  ) as { exercise_id: number; day: string; reps: number | null; weight_kg: number; duration_s: number | null }[];
  for (const r of rows) {
    const list = out.get(r.exercise_id) ?? [];
    const set = { reps: r.reps, weight_kg: r.weight_kg, duration_s: r.duration_s };
    if (list.length && list[list.length - 1].day === r.day) list[list.length - 1].sets.push(set);
    else list.push({ day: r.day, sets: [set] });
    out.set(r.exercise_id, list);
  }
  return out;
}

export async function loadExercise(id: number): Promise<{ id: number; name: string; primary_muscles: Muscle[]; secondary_muscles: Muscle[] } | null> {
  const r = await db().from("exercises").select("id, name, primary_muscles, secondary_muscles").eq("id", id).maybeSingle();
  return check(r, "load exercise") as { id: number; name: string; primary_muscles: Muscle[]; secondary_muscles: Muscle[] } | null;
}

// Sets per day for the week view: [{day, exercise muscles}].
export async function loadRange(fromDay: string, toDay: string) {
  return check(
    await db()
      .from("lift_sets")
      .select("day, reps, weight_kg, exercise:exercises(primary_muscles, secondary_muscles)")
      .gte("day", fromDay)
      .lte("day", toDay)
      .limit(5000),
    "load range",
  ) as unknown as { day: string; reps: number | null; weight_kg: number; exercise: { primary_muscles: Muscle[]; secondary_muscles: Muscle[] } }[];
}

// Days with any cardio between `fromDay` and `toDay`, inclusive (activity heatmap).
export async function loadCardioDays(fromDay: string, toDay: string): Promise<Set<string>> {
  const rows = check(
    await db().from("cardio_sessions").select("day").gte("day", fromDay).lte("day", toDay),
    "load cardio days",
  ) as { day: string }[];
  return new Set(rows.map((r) => r.day));
}

// Compact log of the `days` days before `day`, for Claude ("what did I bench last week",
// "same as last push day").
export async function loadRecentLog(day: string, days = 14): Promise<string> {
  const from = addDays(day, -days);
  const [sets, cardio] = await Promise.all([
    db().from("lift_sets").select("day, reps, weight_kg, duration_s, exercise:exercises(name)").gte("day", from).lt("day", day).order("day").order("id").limit(3000),
    db().from("cardio_sessions").select("day, kind, minutes, distance_km").gte("day", from).lt("day", day).order("day").order("id"),
  ]);
  const setRows = check(sets, "load recent sets") as unknown as { day: string; reps: number | null; weight_kg: number; duration_s: number | null; exercise: { name: string } }[];
  const cardioRows = check(cardio, "load recent cardio") as { day: string; kind: string; minutes: number; distance_km: number | null }[];

  const byDay = new Map<string, Map<string, SimpleSet[]>>();
  for (const r of setRows) {
    const d = byDay.get(r.day) ?? new Map<string, SimpleSet[]>();
    const list = d.get(r.exercise.name) ?? [];
    list.push({ reps: r.reps, weight_kg: r.weight_kg, duration_s: r.duration_s });
    d.set(r.exercise.name, list);
    byDay.set(r.day, d);
  }
  const days_ = [...new Set([...byDay.keys(), ...cardioRows.map((c) => c.day)])].sort();
  return days_
    .map((d) => {
      const lifts = [...(byDay.get(d) ?? [])].map(([name, list]) => `${name} ${formatSets(list)}`);
      const runs = cardioRows.filter((c) => c.day === d).map((c) => `${c.kind} ${c.minutes} min${c.distance_km ? ` ${c.distance_km} km` : ""}`);
      return `${niceDate(d)} (${d}): ${[...lifts, ...runs].join("; ")}`;
    })
    .join("\n");
}

// The last session of every lift before `day`, however long ago, with the next target:
// "dumbbell bench press: last Sat 7 Nov 9, 8, 7 @ 24kg; next 24kg: 9, 9, 8 reps".
// For "what weight should I do on db chest?" and "what did I do last time?".
export async function loadLastSessions(day: string): Promise<string> {
  const rows = check(
    await db()
      .from("lift_sets")
      .select("day, reps, weight_kg, duration_s, exercise:exercises(name)")
      .lt("day", day)
      .order("day", { ascending: false })
      .order("set_no")
      .limit(5000),
    "load last sessions",
  ) as unknown as { day: string; reps: number | null; weight_kg: number; duration_s: number | null; exercise: { name: string } }[];

  const last = new Map<string, { day: string; sets: SimpleSet[] }>();
  for (const r of rows) {
    const s = last.get(r.exercise.name);
    if (s && s.day !== r.day) continue; // already have a newer session
    const entry = s ?? { day: r.day, sets: [] };
    entry.sets.push({ reps: r.reps, weight_kg: r.weight_kg, duration_s: r.duration_s });
    last.set(r.exercise.name, entry);
  }
  return [...last]
    .map(([name, s]) => `${name}: last ${niceDate(s.day)} ${compactSets(s.sets)}; next ${nextTarget(s.sets, name)}`)
    .join("\n");
}

export async function saveTurn(msgDay: string, entryDay: string, turn: Turn, userText: string): Promise<void> {
  check(
    await db().rpc("log_turn", {
      p_msg_day: msgDay,
      p_entry_day: entryDay,
      p_lifts: turn.lifts,
      p_cardio: turn.cardio,
      p_messages: [
        { role: "user", text: userText },
        { role: "bot", text: turn.reply },
      ],
      p_remove_sets: turn.removeSetIds,
      p_remove_cardio: turn.removeCardioIds,
    }),
    "save turn",
  );
}

export async function deleteEntries(setIds: number[], cardioIds: number[]): Promise<void> {
  check(await db().rpc("delete_entries", { p_set_ids: setIds, p_cardio_ids: cardioIds }), "delete entries");
}

export async function moveEntries(setIds: number[], cardioIds: number[], toDay: string): Promise<void> {
  check(await db().rpc("move_entries", { p_set_ids: setIds, p_cardio_ids: cardioIds, p_to: toDay }), "move entries");
}

// The day's log with ids, for Claude (so it can correct or remove entries).
export function describeDay(sets: DaySet[], cardio: DayCardio[]): string {
  const byExercise = new Map<string, string[]>();
  for (const s of sets) {
    const list = byExercise.get(s.exercise.name) ?? [];
    const what = [s.reps ? `${s.reps} reps` : "", s.duration_s ? `${s.duration_s}s` : "", s.weight_kg ? `${s.weight_kg}kg` : "bodyweight"].filter(Boolean).join(" ");
    list.push(`#${s.id} ${what}`);
    byExercise.set(s.exercise.name, list);
  }
  const lifts = [...byExercise].map(([name, list]) => `${name}: ${list.join(", ")}`);
  const runs = cardio.map((c) => `cardio #${c.id} ${c.kind} ${c.minutes} min${c.distance_km ? `, ${c.distance_km} km` : ""}`);
  return [...lifts, ...runs].join("; ");
}

// ---- Progress photos: one front photo per day, in the private "progress-photos" bucket ----
const PHOTOS = "progress-photos";

// Every day with a photo, oldest first (photos are kept forever, so no date window).
export async function loadPhotoDays(): Promise<string[]> {
  const rows = check(await db().from("progress_photos").select("day").order("day"), "load photo days") as { day: string }[];
  return rows.map((r) => r.day);
}

// Short-lived links to the given days' photos (the bucket is private).
export async function photoUrls(days: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(days)];
  if (!unique.length) return out;
  const r = await db().storage.from(PHOTOS).createSignedUrls(unique.map((d) => `${d}.jpg`), 60 * 60);
  if (r.error) throw new Error(`sign photo urls: ${r.error.message}`);
  for (const s of r.data) if (s.signedUrl && s.path) out.set(s.path.slice(0, 10), s.signedUrl);
  return out;
}

// Saves (or replaces) the day's photo.
export async function savePhoto(day: string, jpeg: ArrayBuffer): Promise<void> {
  const path = `${day}.jpg`;
  const up = await db().storage.from(PHOTOS).upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
  if (up.error) throw new Error(`upload photo: ${up.error.message}`);
  check(await db().from("progress_photos").upsert({ day, path, updated_at: new Date().toISOString() }), "save photo");
}
