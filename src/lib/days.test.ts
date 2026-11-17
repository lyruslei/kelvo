import { test } from "node:test";
import assert from "node:assert/strict";
import { daysApart, dayWord, monthGrid, parseDay, parseRestDay, relativeDay, shortDate, todayIn } from "./days.ts";

test("parseDay accepts real past dates within a year", () => {
  assert.equal(parseDay("2026-11-02", "2026-11-09"), "2026-11-02");
  assert.equal(parseDay("2026-11-09", "2026-11-09"), "2026-11-09");
});

test("parseDay rejects bad, future and too-old dates", () => {
  for (const v of ["", "yesterday", "2026-2-1", "2026-02-31", "2026-11-10", "2025-11-08", undefined, ["2026-11-02"]]) {
    assert.equal(parseDay(v, "2026-11-09"), null, String(v));
  }
});

test("relativeDay", () => {
  assert.equal(relativeDay("2026-11-09", "2026-11-09"), "Today");
  assert.equal(relativeDay("2026-11-10", "2026-11-09"), "Tomorrow");
  assert.equal(relativeDay("2026-11-11", "2026-11-09"), "Wednesday");
});

test("todayIn uses the time zone", () => {
  const t = new Date("2026-11-09T17:00:00Z"); // 01:00 next day in Manila
  assert.equal(todayIn("Asia/Manila", t), "2026-11-10");
  assert.equal(todayIn("UTC", t), "2026-11-09");
});

test("rest days can be planned up to 60 days ahead", () => {
  assert.equal(parseRestDay("2026-11-14", "2026-11-09"), "2026-11-14");
  assert.equal(parseRestDay("2027-01-08", "2026-11-09"), "2027-01-08"); // day 60
  assert.equal(parseRestDay("2027-01-09", "2026-11-09"), null);
  assert.equal(parseRestDay("2026-11-31", "2026-11-09"), null);
  assert.equal(parseRestDay("2026-11-02", "2026-11-09"), "2026-11-02"); // past still fine
});

test("monthGrid pads to Sunday and lists every day", () => {
  const g = monthGrid("2026-11"); // 1 Nov 2026 is a Sunday
  assert.equal(g[0], "2026-11-01");
  assert.equal(g.length, 30);
  const feb = monthGrid("2027-02"); // starts Monday: one blank
  assert.equal(feb[0], null);
  assert.equal(feb.filter(Boolean).length, 28);
});

test("daysApart counts whole days, across months and years", () => {
  assert.equal(daysApart("2026-11-01", "2026-11-17"), 16);
  assert.equal(daysApart("2026-09-01", "2026-12-08"), 98);
  assert.equal(daysApart("2026-12-31", "2027-01-01"), 1);
  assert.equal(daysApart("2026-11-17", "2026-11-17"), 0);
});

test("shortDate", () => {
  assert.equal(shortDate("2026-09-01"), "Sep 1");
  assert.equal(shortDate("2026-09-01", true), "Sep 1, 2026");
});

test("dayWord", () => {
  assert.equal(dayWord("2026-11-17", "2026-11-17"), "today");
  assert.equal(dayWord("2026-11-16", "2026-11-17"), "yesterday");
  assert.equal(dayWord("2026-09-05", "2026-11-17"), "Sep 5");
  assert.equal(dayWord("2025-12-30", "2026-01-02"), "Dec 30, 2025");
});
