import { test } from "node:test";
import assert from "node:assert/strict";
import { groupsHit, isRestDay, suggestNext, type Group, type History } from "./schedule.ts";
import { addDays } from "./days.ts";

const h = (entries: Record<string, Group[]>): History => new Map(Object.entries(entries).map(([d, g]) => [d, new Set(g)]));

test("addDays crosses months and years", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("only full glow counts as hitting a group", () => {
  assert.deepEqual([...groupsHit({ chest: "full", triceps: "soft", front_delts: "soft" })], ["chest"]);
  assert.deepEqual([...groupsHit({ calves: "full" })], []); // calves alone isn't a legs day
  assert.deepEqual([...groupsHit({ lats: "full", biceps: "full" })], ["back", "arms"]);
});

test("rest day after hitting every group within 3 days", () => {
  const hist = h({
    "2026-11-07": ["chest", "back"],
    "2026-11-08": ["shoulders", "arms"],
    "2026-11-09": ["legs", "abs"],
  });
  assert.equal(isRestDay("2026-11-10", hist), true);
  // The round doesn't earn a second rest day.
  assert.equal(isRestDay("2026-11-11", hist), false);
});

test("no rest day when the round took more than 3 days", () => {
  const hist = h({
    "2026-11-06": ["chest", "back"],
    "2026-11-08": ["shoulders", "arms"],
    "2026-11-09": ["legs", "abs"],
  });
  assert.equal(isRestDay("2026-11-10", hist), false);
});

test("no rest day when yesterday was already a day off", () => {
  const hist = h({ "2026-11-06": ["chest", "back"], "2026-11-07": ["shoulders", "arms"], "2026-11-08": ["legs", "abs"] });
  assert.equal(isRestDay("2026-11-09", hist), true);
  assert.equal(isRestDay("2026-11-10", hist), false);
});

test("after chest and back today: arms and shoulders, then legs and abs, then rest", () => {
  const plan = suggestNext("2026-11-09", h({ "2026-11-09": ["chest", "back"] }));
  assert.deepEqual(plan, [
    { day: "2026-11-10", rest: false, groups: ["shoulders", "arms"] },
    { day: "2026-11-11", rest: false, groups: ["legs", "abs"] },
    { day: "2026-11-12", rest: true, groups: [] },
  ]);
});

test("nothing logged today: the plan starts today with what's rested longest", () => {
  const plan = suggestNext("2026-11-09", h({ "2026-11-08": ["legs", "abs"], "2026-11-05": ["chest"] }));
  assert.equal(plan[0].day, "2026-11-09");
  assert.deepEqual(plan[0].groups, ["back", "shoulders"]); // never hit, so first
});

test("a rest day today shows up first in the plan", () => {
  const hist = h({ "2026-11-06": ["chest", "back"], "2026-11-07": ["shoulders", "arms"], "2026-11-08": ["legs", "abs"] });
  const plan = suggestNext("2026-11-09", hist);
  assert.deepEqual(plan[0], { day: "2026-11-09", rest: true, groups: [] });
  assert.deepEqual(plan[1].groups, ["chest", "back"]);
});

test("never suggests a group trained the day before", () => {
  // Hit everything but shoulders today: tomorrow is shoulders alone, not "chest + shoulders".
  const plan = suggestNext("2026-11-09", h({ "2026-11-09": ["chest", "back", "arms", "legs", "abs"] }));
  assert.deepEqual(plan[0], { day: "2026-11-10", rest: false, groups: ["shoulders"] });
  for (const p of plan) {
    const prev = plan.find((q) => q.day === addDays(p.day, -1));
    if (prev) for (const g of p.groups) assert.ok(!prev.groups.includes(g), `${g} on back-to-back days`);
  }
});
