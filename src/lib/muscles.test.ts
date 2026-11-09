import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGlow } from "./muscles.ts";

test("primary glows full, secondary glows soft", () => {
  assert.deepEqual(computeGlow([{ primary: ["chest"], secondary: ["front_delts", "triceps"] }]), {
    chest: "full", front_delts: "soft", triceps: "soft",
  });
});

test("full wins when a muscle is secondary in one lift and primary in another", () => {
  const glow = computeGlow([
    { primary: ["chest"], secondary: ["triceps"] },
    { primary: ["triceps"], secondary: [] },
  ]);
  assert.equal(glow.triceps, "full");
});

test("full wins regardless of order", () => {
  const glow = computeGlow([
    { primary: ["triceps"], secondary: [] },
    { primary: ["chest"], secondary: ["triceps"] },
  ]);
  assert.equal(glow.triceps, "full");
});

test("no exercises, nothing glows", () => {
  assert.deepEqual(computeGlow([]), {});
});
