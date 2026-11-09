import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDay, relativeDay, todayIn } from "./days.ts";

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
