import { test } from "node:test";
import assert from "node:assert/strict";
import { compactSets, compare, formatSets, personalRecord, volume } from "./progress.ts";

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
  assert.deepEqual(compare([s(8, 26)], [s(10, 24)]), { verdict: "up", note: "Top set +2kg" });
  assert.deepEqual(compare([s(10, 22)], [s(10, 24)]), { verdict: "down", note: "Top set -2kg" });
});

test("same top weight: reps at that weight decide", () => {
  assert.deepEqual(compare([s(11, 24), s(9, 24)], [s(10, 24), s(10, 24)]), { verdict: "up", note: "+1 reps @ 24kg" });
  assert.deepEqual(compare([s(9, 24)], [s(10, 24)]), { verdict: "down", note: "-1 reps @ 24kg" });
  assert.deepEqual(compare([s(10, 24)], [s(10, 24)]), { verdict: "same", note: "Same top set, 10 @ 24kg" });
});

test("same top set: total volume breaks the tie", () => {
  assert.deepEqual(compare([s(12, 30), s(10, 30)], [s(12, 30), s(12, 30)]), { verdict: "down", note: "Same top set, volume -60kg" });
  assert.deepEqual(compare([s(12, 30), s(12, 30), s(8, 30)], [s(12, 30), s(12, 30)]), { verdict: "up", note: "Same top set, volume +240kg" });
});

test("bodyweight lifts compare total reps", () => {
  assert.deepEqual(compare([s(12, 0), s(10, 0)], [s(10, 0), s(10, 0)]), { verdict: "up", note: "+2 total reps" });
});

test("volume", () => {
  assert.equal(volume([s(10, 24), s(8, 26)]), 448);
});

test("timed holds format and compare by total time", () => {
  const p = (d: number) => ({ reps: null, weight_kg: 0, duration_s: d });
  assert.equal(formatSets([p(60), p(60), p(60)]), "3x1 min");
  assert.equal(formatSets([p(45)]), "45s");
  assert.deepEqual(compare([p(60), p(60)], [p(45), p(45)]), { verdict: "up", note: "+30s total time" });
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
