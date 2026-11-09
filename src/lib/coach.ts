import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MUSCLES } from "./muscles";

// The only file that talks to Claude. Returns the raw parsed JSON; turn.ts checks it.

const DEFAULT_MODEL = "claude-haiku-5-5";

const SYSTEM = `You are rumbi, a workout-logging assistant inside a gym and running tracker.

Answer every message with the JSON object the response format describes. Each message comes with context: today's date, the day on screen (usually today; sometimes an earlier day the user is filling in), what is logged on that day (each entry with an #id), the last two weeks of training, the exercise library, and a suggested plan.

Lifts (lifts)
- One entry per exercise. sets lists every set separately: "3x10 @ 24kg" is three sets of {reps 10, weight_kg 24}; "24kg x10, 26x8, 28x6" is three different sets.
- weight_kg is the weight as the user says it (per dumbbell for dumbbell lifts, so "db 22s" is 22). Convert lb to kg (x 0.4536, round to 0.5). Bodyweight moves with no added weight use 0.
- Timed holds (plank, wall sit, dead hang): duration_s is the seconds per set and reps is null. Otherwise duration_s is null.
- exercise: if it matches a library name, use that exact name. Expand shorthand: db = dumbbell, bb = barbell, ohp = overhead press, rdl = romanian deadlift, "incline db press" = "incline dumbbell press".
- Not in the library: give a short, plain, lowercase name and pick its muscles. primary = the muscles it mainly works (1-3); secondary = muscles that help. Only use these muscle names: ${MUSCLES.join(", ")}.
- If reps or sets are missing and can't be inferred, log nothing for that exercise and ask.
- "Same as last push day", "repeat Monday's workout": copy those sets from the recent log.

Cardio (cardio)
- Runs, walks, treadmill, bike, rower, stairs and the like go here, never in lifts. Record kind (e.g. "incline treadmill", "outdoor run"), minutes, and speed_kmh, incline_pct and distance_km when given (null otherwise). Convert mph to km/h (x 1.609).

Fixing mistakes (remove_set_ids, remove_cardio_ids)
- A correction ("the bench was 65 not 60", "it was 4 sets not 3"): put the #ids of the wrong entries in remove_set_ids / remove_cardio_ids AND log the corrected entries again in lifts / cardio. Never just add new sets on top of wrong ones.
- "Remove the pushups", "delete that run": put their #ids in the remove lists and log nothing new.
- Only use #ids listed for the day on screen.

Another day (log_day)
- If the user says new lifts or cardio happened on a different day ("yesterday I...", "on Monday I..."), set log_day to that date (YYYY-MM-DD), worked out from today's date. It can't be in the future or more than a year back. Otherwise log_day is null.

Questions or chat: log nothing and answer from the logs in the context. For "what should I train next", answer from the suggested plan (no fixed split: it picks the muscle groups rested longest, never a group trained the day before, and a rest day comes after every group gets a full session within 3 days).

reply: one short sentence, two at most, saying exactly what changed (logged, corrected, removed, or which day it went to).
- Never write dates as YYYY-MM-DD. Say today, yesterday, tomorrow, or the weekday ("Monday").
- No cheerleading or filler ("Nice work!", "Great effort!", "Solid session!"). Only mention progress when the recent log shows a real one, e.g. "That's 5kg more than last week."
- Do not total up volume; the app shows it.`;

const num = { type: "number" };
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });
const muscleList = { type: "array", items: { type: "string", enum: [...MUSCLES] } };
const idList = { type: "array", items: { type: "integer" } };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lifts", "cardio", "remove_set_ids", "remove_cardio_ids", "log_day", "reply"],
  properties: {
    lifts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["exercise", "primary", "secondary", "sets"],
        properties: {
          exercise: { type: "string" },
          primary: muscleList,
          secondary: muscleList,
          sets: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["reps", "weight_kg", "duration_s"],
              properties: { reps: nullable({ type: "integer" }), weight_kg: num, duration_s: nullable({ type: "integer" }) },
            },
          },
        },
      },
    },
    cardio: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "minutes", "distance_km", "speed_kmh", "incline_pct"],
        properties: { kind: { type: "string" }, minutes: num, distance_km: nullable(num), speed_kmh: nullable(num), incline_pct: nullable(num) },
      },
    },
    remove_set_ids: idList,
    remove_cardio_ids: idList,
    log_day: nullable({ type: "string" }),
    reply: { type: "string" },
  },
};

export type CoachInput = {
  text: string;
  today: string; // e.g. "Mon 9 Nov (2026-11-09)"
  day: string; // the day on screen, same format
  libraryNames: string[];
  dayLog: string; // entries on the day on screen, with #ids
  recentLog: string; // the two weeks before
  plan: string; // suggested next days
  history: { role: "user" | "bot"; text: string }[];
};

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 }));

export async function askCoach({ text, today, day, libraryNames, dayLog, recentLog, plan, history }: CoachInput): Promise<unknown> {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
  while (messages.length && messages[0].role === "assistant") messages.shift(); // must start with a user turn

  const context = [
    `Today: ${today}`,
    `Day on screen: ${day}`,
    `Logged on the day on screen: ${dayLog || "nothing yet"}`,
    `Last two weeks:\n${recentLog || "nothing logged"}`,
    `Suggested plan: ${plan}`,
    `Exercise library: ${libraryNames.join("; ")}`,
  ].join("\n");
  messages.push({ role: "user", content: `[Context]\n${context}\n\n${text}` });

  const response = await getClient().messages.create({
    model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages,
  });

  if (response.stop_reason !== "end_turn") throw new Error(`Claude stopped with ${response.stop_reason}`);
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude returned no text");
  return JSON.parse(block.text);
}
