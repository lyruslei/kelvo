import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, formatSets, volume } from "./progress.ts";

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
