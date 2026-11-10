// Demo data for the showcase video, loaded straight into the database in .env.local.
//
//   node scripts/demo/demo.mjs load    wipe the log, then add 6 weeks of training up to yesterday
//   node scripts/demo/demo.mjs clear   wipe the log (lifts, cardio, chat, rest days): a fresh start
//
// Both wipe everything you've logged; the exercise library stays. Run `load` on the day you
// record, so "today" and "yesterday" line up with the real date (Asia/Manila).
//
// The story it sets up for the video script:
// - Today is a push day with nothing logged yet, so "bench 65kg 8 8 7" lights the body map
//   from blank and shows a new best (last push day: bench 62.5kg x 9, 9, 9).
// - Yesterday was an earned rest day, so today isn't one.
// - "db chest?" answers incline dumbbell press 9, 9, 9 @ 22kg, so today 24kg; bench today 65kg.
// - Push / pull / legs / rest, repeating, with double progression (6-9 reps, 2-3 sets),
//   plus runs and treadmill so the Cardio stat and Activity heatmap fill in.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const command = process.argv[2];
if (command !== "load" && command !== "clear") {
  console.error("Usage: node scripts/demo/demo.mjs load|clear");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const check = ({ error }, what) => { if (error) throw new Error(`${what}: ${error.message}`); };

// Today in Asia/Manila as YYYY-MM-DD, and n days before it.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: env.APP_TIMEZONE || "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const daysAgo = (n) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

async function wipe() {
  check(await db.from("lift_sets").delete().gte("id", 0), "clear lifts");
  check(await db.from("cardio_sessions").delete().gte("id", 0), "clear cardio");
  check(await db.from("messages").delete().gte("id", 0), "clear chat");
  check(await db.from("rest_days").delete().gte("day", "1900-01-01"), "clear rest days");
}

if (command === "clear") {
  await wipe();
  console.log("Cleared: no lifts, cardio, chat or rest days. The exercise library is kept.");
  process.exit(0);
}

// ---- load ----
const DAYS = 42; // 6 weeks back from today
// n days ago, n % 4: 0 push (today, left empty), 3 pull, 2 legs, 1 rest.
const kindOf = (n) => ["push", "rest", "legs", "pull"][n % 4];

// Each lift: weight (kg, 0 = bodyweight), reps at its first session, step.
// Weighted: every set at 9+ -> add `step`, reps back to [7, 6, 6]; else +1 rep per set, max 9.
// Bodyweight: +1 rep per set every other session. Timed (plank): +5s per set each session.
const PLAN = {
  push: [
    { name: "bench press", kg: 57.5, reps: [9, 8, 8], step: 2.5 },
    { name: "incline dumbbell press", kg: 18, reps: [9, 9, 8], step: 2 },
    { name: "lateral raise", kg: 8, reps: [8, 7, 7], step: 2 },
    { name: "tricep pushdown", kg: 22.5, reps: [7, 7, 6], step: 2.5 },
  ],
  pull: [
    { name: "pull up", kg: 0, reps: [6, 5, 5] },
    { name: "barbell row", kg: 50, reps: [8, 8, 7], step: 2.5 },
    { name: "lat pulldown", kg: 45, reps: [9, 8, 7], step: 2.5 },
    { name: "dumbbell curl", kg: 10, reps: [8, 7, 7], step: 2 },
    { name: "hanging leg raise", kg: 0, reps: [10, 9] },
  ],
  legs: [
    { name: "back squat", kg: 70, reps: [8, 7, 7], step: 2.5 },
    { name: "romanian deadlift", kg: 60, reps: [9, 8, 8], step: 2.5 },
    { name: "leg extension", kg: 35, reps: [8, 8, 7], step: 2.5 },
    { name: "calf raise", kg: 40, reps: [9, 9, 8], step: 2.5 },
    { name: "plank", hold: [40, 40] },
  ],
};

const state = new Map();
function nextSession(lift) {
  const s = state.get(lift.name) ?? { kg: lift.kg ?? 0, reps: lift.reps ? [...lift.reps] : null, hold: lift.hold ? [...lift.hold] : null, sessions: 0 };
  if (s.sessions > 0) {
    if (s.hold) s.hold = s.hold.map((t) => t + 5);
    else if (s.kg === 0) { if (s.sessions % 2 === 0) s.reps = s.reps.map((r) => r + 1); }
    else if (s.reps.every((r) => r >= 9)) { s.kg += lift.step; s.reps = [7, 6, 6]; }
    else s.reps = s.reps.map((r) => Math.min(9, r + 1));
  }
  s.sessions++;
  state.set(lift.name, s);
  return s.hold ? s.hold.map((t) => ({ reps: null, kg: 0, secs: t })) : s.reps.map((r) => ({ reps: r, kg: s.kg, secs: null }));
}

const { data: exercises, error } = await db.from("exercises").select("id, name");
if (error) throw new Error(`load exercises: ${error.message}`);
const idOf = new Map(exercises.map((e) => [e.name, e.id]));
for (const lift of Object.values(PLAN).flat()) if (!idOf.has(lift.name)) throw new Error(`"${lift.name}" isn't in the exercise library`);

const sets = [], cardio = [], messages = [];
const say = (day, user, bot) => messages.push({ day, role: "user", text: user }, { day, role: "bot", text: bot });
for (let n = DAYS; n >= 1; n--) {
  const day = daysAgo(n);
  const kind = kindOf(n);
  if (kind === "rest") {
    if (n % 8 === 1) {
      cardio.push({ day, kind: "outdoor run", minutes: 28, distance_km: 5 });
      say(day, "ran 5k in 28 min", "Logged a 5 km outdoor run, 28 minutes.");
    }
    continue;
  }
  const lifts = PLAN[kind].map((lift) => ({ name: lift.name, sets: nextSession(lift) }));
  for (const { name, sets: ss } of lifts)
    ss.forEach((x, i) => sets.push({ day, exercise_id: idOf.get(name), set_no: i + 1, reps: x.reps, weight_kg: x.kg, duration_s: x.secs }));

  let text = lifts
    .map(({ name, sets: ss }) => (ss[0].secs ? `${name} ${ss.map((x) => `${x.secs}s`).join(" ")}` : `${name} ${ss[0].kg ? `${ss[0].kg}kg ` : ""}${ss.map((x) => x.reps).join(" ")}`))
    .join(", ");
  let reply = `Logged ${lifts.map((l) => l.name).join(", ").replace(/, ([^,]*)$/, " and $1")}.`;
  if (kind === "pull") {
    cardio.push({ day, kind: "incline treadmill", minutes: 15, distance_km: 1.1, speed_kmh: 4.5, incline_pct: 12 });
    text += ", 15 min incline treadmill 12 incline 4.5 km/h";
    reply = reply.replace(/\.$/, ", plus 15 minutes of incline treadmill.");
  }
  say(day, text, reply);
}

await wipe();
check(await db.from("lift_sets").insert(sets), "add lifts");
check(await db.from("cardio_sessions").insert(cardio), "add cardio");
check(await db.from("messages").insert(messages), "add chat");
console.log(`Loaded demo for today ${today}: ${sets.length} sets, ${cardio.length} cardio, ${messages.length} chat messages, ${daysAgo(DAYS)} to ${daysAgo(1)}.`);
