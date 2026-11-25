import { test } from "node:test";
import assert from "node:assert/strict";
import { compactSets, compare, formatSets, nextTarget, personalRecord, volume } from "./progress.ts";

const s = (reps: number, weight_kg: number) => ({ reps, weight_kg });

test("formatSets groups identical runs", () => {
  assert.equal(formatSets([s(10, 24), s(10, 24), s(10, 24), s(8, 26)]), "3x10 @ 24kg, 8 @ 26kg");
  assert.equal(formatSets([s(12, 0), s(12, 0)]), "2x12 bodyweight");
  assert.equal(formatSets([s(5, 22.5)]), "5 @ 22.5kg");
});

test("first time when there's no last session", () => {
  assert.equal(compare([s(10, 24)], null).verdict, "first");
  assert.equal(compare([s(10, 24)], []).verdict, "first");
});

test("heavier top set is up, lighter is down", () => {
  assert.deepEqual(compare([s(8, 26)], [s(10, 24)]), { verdict: "up", note: "Top set +2kg", change: "+2kg" });
  assert.deepEqual(compare([s(10, 22)], [s(10, 24)]), { verdict: "down", note: "Top set -2kg", change: "-2kg" });
});

test("same top weight: reps at that weight decide", () => {
  assert.deepEqual(compare([s(11, 24), s(9, 24)], [s(10, 24), s(10, 24)]), { verdict: "up", note: "+1 reps @ 24kg", change: "+1 rep" });
  assert.deepEqual(compare([s(9, 24)], [s(10, 24)]), { verdict: "down", note: "-1 reps @ 24kg", change: "-1 rep" });
  assert.deepEqual(compare([s(10, 24)], [s(10, 24)]), { verdict: "same", note: "Same top set, 10 @ 24kg", change: "Same" });
});

test("same top set: total volume breaks the tie", () => {
  assert.deepEqual(compare([s(12, 30), s(10, 30)], [s(12, 30), s(12, 30)]), { verdict: "down", note: "Same top set, volume -60kg", change: "-60kg vol" });
  assert.deepEqual(compare([s(12, 30), s(12, 30), s(8, 30)], [s(12, 30), s(12, 30)]), { verdict: "up", note: "Same top set, volume +240kg", change: "+240kg vol" });
});

test("bodyweight lifts compare total reps", () => {
  assert.deepEqual(compare([s(12, 0), s(10, 0)], [s(10, 0), s(10, 0)]), { verdict: "up", note: "+2 total reps", change: "+2 reps" });
});

test("volume", () => {
  assert.equal(volume([s(10, 24), s(8, 26)]), 448);
});

test("timed holds format and compare by total time", () => {
  const p = (d: number) => ({ reps: null, weight_kg: 0, duration_s: d });
  assert.equal(formatSets([p(60), p(60), p(60)]), "3x1 min");
  assert.equal(formatSets([p(45)]), "45s");
  assert.deepEqual(compare([p(60), p(60)], [p(45), p(45)]), { verdict: "up", note: "+30s total time", change: "+30s" });
});

test("personal records", () => {
  assert.equal(personalRecord([s(5, 100)], []), null); // first session: no record yet
  assert.equal(personalRecord([s(5, 100)], [[s(5, 95)], [s(8, 90)]]), "Heaviest: 100kg");
  assert.equal(personalRecord([s(7, 95)], [[s(5, 95)], [s(8, 90)]]), "Most reps at 95kg: 7");
  assert.equal(personalRecord([s(5, 95)], [[s(5, 95)]]), null);
  assert.equal(personalRecord([s(15, 0)], [[s(12, 0)]]), "Most reps: 15");
  assert.equal(personalRecord([{ reps: null, weight_kg: 0, duration_s: 90 }], [[{ reps: null, weight_kg: 0, duration_s: 60 }]]), "Longest hold: 90s");
});

test("compactSets says the weight once", () => {
  const s = (reps: number | null, weight_kg: number, duration_s: number | null = null) => ({ reps, weight_kg, duration_s });
  assert.equal(compactSets([s(12, 25), s(12, 25), s(12, 25)]), "3 × 12 @ 25kg");
  assert.equal(compactSets([s(10, 24), s(9, 24), s(8, 24)]), "10, 9, 8 @ 24kg");
  assert.equal(compactSets([s(8, 65), s(8, 65), s(7, 65)]), "8, 8, 7 @ 65kg");
  assert.equal(compactSets([s(8, 60), s(6, 70)]), "8 @ 60kg · 6 @ 70kg");
  assert.equal(compactSets([s(15, 0), s(12, 0)]), "15, 12 bodyweight");
  assert.equal(compactSets([s(null, 0, 60), s(null, 0, 60)]), "2 × 1 min");
});

test("nextTarget: below the top of 6-9, same weight, one more rep on each set under 9", () => {
  assert.equal(nextTarget([s(9, 24), s(8, 24), s(7, 24)], "dumbbell bench press"), "24kg: 9, 9, 8 reps");
});

test("nextTarget: every set at 9+, add 2kg per dumbbell and start back at 6", () => {
  assert.equal(nextTarget([s(9, 24), s(9, 24), s(10, 24)], "dumbbell bench press"), "26kg: 6, 6, 6 reps");
});

test("nextTarget: barbell and machines go up 2.5kg", () => {
  assert.equal(nextTarget([s(9, 65), s(9, 65)], "bench press"), "67.5kg: 6, 6 reps");
});

test("nextTarget: works off the top-weight sets, 2 to 3 of them", () => {
  // warm-up at 20 ignored; one top set only still plans 2 sets
  assert.equal(nextTarget([s(12, 20), s(7, 26)], "dumbbell shoulder press"), "26kg: 8, 8 reps");
  // four top sets plan 3
  assert.equal(nextTarget([s(9, 24), s(9, 24), s(8, 24), s(6, 24)], "dumbbell bench press"), "24kg: 9, 9, 9 reps");
});

test("nextTarget: bodyweight adds a rep a set, holds add 5s", () => {
  assert.equal(nextTarget([s(12, 0), s(10, 0)], "pull-up"), "bodyweight: 13, 11 reps");
  assert.equal(nextTarget([{ reps: null, weight_kg: 0, duration_s: 60 }, { reps: null, weight_kg: 0, duration_s: 45 }], "plank"), "65s, 50s");
});
