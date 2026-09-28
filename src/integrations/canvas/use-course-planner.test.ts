import assert from "node:assert/strict";
import { test } from "node:test";
import { currentWeekRange } from "./use-course-planner";

test("currentWeekRange returns the local Monday through Sunday", () => {
  assert.deepEqual(currentWeekRange(new Date(2026, 8, 30, 12)), {
    startDate: "2026-09-28",
    endDate: "2026-10-04",
  });
});

test("currentWeekRange keeps Sunday in the preceding Monday's week", () => {
  assert.deepEqual(currentWeekRange(new Date(2026, 9, 4, 12)), {
    startDate: "2026-09-28",
    endDate: "2026-10-04",
  });
});
