import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTurn, summarizeDay, canonicalName, pace, type Library } from "./turn.ts";

const library: Library = new Map([
  ["incline dumbbell press", { primary: ["chest"], secondary: ["front_delts", "triceps"] }],
]);

test("a known lift keeps its library muscles, whatever Claude said", () => {
  const t = normalizeTurn(
    { lifts: [{ exercise: "Incline Dumbbell Press", primary: ["biceps"], secondary: [], sets: [{ reps: 10, weight_kg: 24 }] }], cardio: [], reply: "Logged." },
    library,
  );
  assert.deepEqual(t.lifts[0].primary, ["chest"]);
  assert.deepEqual(t.lifts[0].secondary, ["front_delts", "triceps"]);
  assert.equal(t.lifts[0].exercise, "incline dumbbell press");
});

test("a new lift uses Claude's muscles, dropping unknown names and duplicates", () => {
  const t = normalizeTurn(
    { lifts: [{ exercise: "Pec deck", primary: ["chest", "chest", "pecs"], secondary: ["chest", "front_delts"], sets: [{ reps: 12, weight_kg: 40 }] }], cardio: [], reply: "x" },
    library,
  );
  assert.deepEqual(t.lifts[0].primary, ["chest"]);
  assert.deepEqual(t.lifts[0].secondary, ["front_delts"]);
});

test("bad sets are dropped, and a lift with no good sets is dropped", () => {
  const t = normalizeTurn(
    {
      lifts: [
        { exercise: "bench press", primary: ["chest"], secondary: [], sets: [{ reps: 0, weight_kg: 60 }, { reps: 8, weight_kg: -5 }, { reps: 8, weight_kg: 60 }] },
        { exercise: "curl", primary: ["biceps"], secondary: [], sets: [{ reps: "ten", weight_kg: 10 }] },
      ],
      cardio: [],
      reply: "x",
    },
    library,
  );
  assert.equal(t.lifts.length, 1);
  assert.deepEqual(t.lifts[0].sets, [{ reps: 8, weight_kg: 60, duration_s: null }]);
});

test("a lift with no valid primary muscle is dropped", () => {
  const t = normalizeTurn({ lifts: [{ exercise: "mystery", primary: ["nose"], secondary: [], sets: [{ reps: 5, weight_kg: 5 }] }], cardio: [], reply: "x" }, library);
  assert.equal(t.lifts.length, 0);
});

test("treadmill distance is worked out from minutes and speed", () => {
  const t = normalizeTurn(
    { lifts: [], cardio: [{ kind: "Incline treadmill", minutes: 15, distance_km: null, speed_kmh: 4.2, incline_pct: 20 }], reply: "x" },
    library,
  );
  assert.deepEqual(t.cardio[0], { kind: "incline treadmill", minutes: 15, distance_km: 1.05, speed_kmh: 4.2, incline_pct: 20 });
});

test("a given distance wins over the worked-out one", () => {
  const t = normalizeTurn({ lifts: [], cardio: [{ kind: "run", minutes: 30, distance_km: 5, speed_kmh: 9, incline_pct: null }], reply: "x" }, library);
  assert.equal(t.cardio[0].distance_km, 5);
});

test("garbage in gives an empty turn with a fallback reply", () => {
  const empty = { lifts: [], cardio: [], removeSetIds: [], removeCardioIds: [], logDay: null, reply: "Got it." };
  assert.deepEqual(normalizeTurn(null, library), empty);
  assert.deepEqual(normalizeTurn({ lifts: "no", cardio: 3, reply: "" }, library), empty);
});

test("canonical names", () => {
  assert.equal(canonicalName("  Incline  DB-Press! "), "incline db press");
});

test("day summary: volume, sets, cardio and glow", () => {
  const press = { name: "incline dumbbell press", primary_muscles: ["chest" as const], secondary_muscles: ["front_delts" as const, "triceps" as const] };
  const pushdown = { name: "tricep pushdown", primary_muscles: ["triceps" as const], secondary_muscles: [] };
  const s = summarizeDay(
    [
      { reps: 10, weight_kg: 24, exercise: press },
      { reps: 8, weight_kg: 26, exercise: press },
      { reps: 12, weight_kg: 30, exercise: pushdown },
    ],
    [{ kind: "incline treadmill", minutes: 15, distance_km: 1.05 }],
  );
  assert.equal(s.volumeKg, 240 + 208 + 360);
  assert.equal(s.sets, 3);
  assert.equal(s.cardioMin, 15);
  assert.equal(s.cardioKm, 1.05);
  assert.deepEqual(s.glow, { chest: "full", front_delts: "soft", triceps: "full" });
});

test("timed holds keep seconds and no reps", () => {
  const t = normalizeTurn(
    { lifts: [{ exercise: "plank", primary: ["abs"], secondary: [], sets: [{ reps: null, weight_kg: 0, duration_s: 60 }, { reps: null, weight_kg: 0, duration_s: null }] }], cardio: [], reply: "x" },
    library,
  );
  assert.deepEqual(t.lifts[0].sets, [{ reps: null, weight_kg: 0, duration_s: 60 }]);
});

test("removals only keep ids that were shown for that day", () => {
  const allowed = { sets: new Set([11, 12]), cardio: new Set([3]) };
  const t = normalizeTurn({ lifts: [], cardio: [], remove_set_ids: [11, 11, 99, "12"], remove_cardio_ids: [3, 4], reply: "x" }, library, allowed);
  assert.deepEqual(t.removeSetIds, [11]);
  assert.deepEqual(t.removeCardioIds, [3]);
});

test("log_day must look like a date", () => {
  assert.equal(normalizeTurn({ log_day: "2026-11-08", reply: "x" }, library).logDay, "2026-11-08");
  assert.equal(normalizeTurn({ log_day: "yesterday", reply: "x" }, library).logDay, null);
});

test("pace", () => {
  assert.equal(pace(28, 5), "5:36 /km");
  assert.equal(pace(15, null), null);
});
