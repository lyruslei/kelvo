import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MUSCLES } from "./muscles";

// The only file that talks to Claude. Returns the raw parsed JSON; turn.ts checks it.

const DEFAULT_MODEL = "claude-haiku-5-5";

const SYSTEM = `You are rumbi, a workout-logging assistant inside a gym and running tracker.

Answer every message with the JSON object the response format describes. Each message comes with context: today's date, the exercise library (canonical names), and what is already logged today.

Lifts (lifts)
- One entry per exercise. sets lists every set separately: "3x10 @ 24kg" is three sets of {reps 10, weight_kg 24}; "24kg x10, 26x8, 28x6" is three different sets.
- weight_kg is the weight as the user says it (per dumbbell for dumbbell lifts). Convert lb to kg (x 0.4536, round to 0.5). Bodyweight moves with no added weight use 0.
- exercise: if it matches a library name, use that exact name. Expand shorthand: db = dumbbell, bb = barbell, ohp = overhead press, rdl = romanian deadlift, "incline db press" = "incline dumbbell press".
- Not in the library: give a short, plain, lowercase name and pick its muscles. primary = the muscles it mainly works (1-3); secondary = muscles that help. Only use these muscle names: ${MUSCLES.join(", ")}.
- If reps or sets are missing and can't be inferred, log nothing for that exercise and ask.

Cardio (cardio)
- Runs, walks, treadmill, bike, rower, stairs and the like go here, never in lifts. Record kind (e.g. "incline treadmill", "outdoor run"), minutes, and speed_kmh, incline_pct and distance_km when given (null otherwise). Convert mph to km/h (x 1.609).

Questions or chat: log nothing and answer from today's log. For "what should I train next" questions, answer from the suggested plan in the context (it has no fixed split: it picks the muscle groups rested longest, and a rest day comes after every group gets a full session within 3 days).

reply: one or two short, friendly sentences saying what you logged. Do not total up volume; the app shows it.`;

const num = { type: "number" };
const nullableNum = { anyOf: [num, { type: "null" }] };
const muscleList = { type: "array", items: { type: "string", enum: [...MUSCLES] } };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lifts", "cardio", "reply"],
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
            items: { type: "object", additionalProperties: false, required: ["reps", "weight_kg"], properties: { reps: { type: "integer" }, weight_kg: num } },
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
        properties: { kind: { type: "string" }, minutes: num, distance_km: nullableNum, speed_kmh: nullableNum, incline_pct: nullableNum },
      },
    },
    reply: { type: "string" },
  },
};

export type CoachInput = {
  text: string;
  today: string;
  libraryNames: string[];
  todayLog: string; // human-readable summary of what's logged today
  plan: string; // suggested next days
  history: { role: "user" | "bot"; text: string }[];
};

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 }));

export async function askCoach({ text, today, libraryNames, todayLog, plan, history }: CoachInput): Promise<unknown> {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
  while (messages.length && messages[0].role === "assistant") messages.shift(); // must start with a user turn

  const context = [
    `Today: ${today}`,
    `Exercise library: ${libraryNames.join("; ")}`,
    `Logged today so far: ${todayLog || "nothing yet"}`,
    `Suggested plan: ${plan}`,
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
