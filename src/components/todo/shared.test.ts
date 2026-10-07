import assert from "node:assert/strict";
import { test } from "node:test";
import type { CanvasTodoItem } from "@/integrations/canvas/client";
import { buildTodoSections, todoLink, todoRange } from "./shared";

function item(overrides: Partial<CanvasTodoItem>): CanvasTodoItem {
  return {
    id: "1",
    type: "assignment",
    title: "Item",
    date: null,
    courseId: "10",
    courseName: "Course",
    htmlUrl: null,
    pointsPossible: null,
    completed: false,
    submitted: false,
    missing: false,
    late: false,
    graded: false,
    excused: false,
    ...overrides,
  };
}

const now = new Date(2026, 9, 6, 15, 0);
const at = (day: number, hour = 12) =>
  new Date(2026, 9, day, hour).toISOString();

test("the planner range looks back for overdue work and past the last day", () => {
  assert.deepEqual(todoRange(now, 7), {
    startDate: "2026-09-22",
    endDate: "2026-10-14",
  });
});

test("upcoming items group by local day in date order", () => {
  const sections = buildTodoSections(
    [
      item({ id: "a", date: at(8) }),
      item({ id: "b", date: at(6, 20) }),
      item({ id: "c", date: at(8, 9) }),
    ],
    now,
    { window: 7, showCompleted: false },
  );
  assert.deepEqual(
    sections.groups.map((group) => [group.key, group.items.map((i) => i.id)]),
    [
      ["2026-10-06", ["b"]],
      ["2026-10-08", ["a", "c"]],
    ],
  );
  assert.equal(sections.groups[0].label, "Today");
});

test("past graded work is overdue, past notes and completed work are not", () => {
  const sections = buildTodoSections(
    [
      item({ id: "late", date: at(3) }),
      item({ id: "done", date: at(3), completed: true }),
      item({ id: "excused", date: at(3), excused: true }),
      item({ id: "note", type: "planner_note", date: at(3) }),
    ],
    now,
    { window: 7, showCompleted: false },
  );
  assert.deepEqual(
    sections.overdue.map((entry) => entry.id),
    ["late"],
  );
});

test("completed upcoming items appear only when requested", () => {
  const items = [item({ id: "x", date: at(7), completed: true })];
  assert.equal(
    buildTodoSections(items, now, { window: 7, showCompleted: false }).groups
      .length,
    0,
  );
  assert.equal(
    buildTodoSections(items, now, { window: 7, showCompleted: true }).groups
      .length,
    1,
  );
});

test("items past the chosen window or without dates are skipped", () => {
  const sections = buildTodoSections(
    [item({ id: "far", date: at(30) }), item({ id: "none", date: null })],
    now,
    { window: 7, showCompleted: true },
  );
  assert.equal(sections.groups.length, 0);
  assert.equal(sections.overdue.length, 0);
});

test("assignments, quizzes and discussions link inside the app", () => {
  assert.deepEqual(todoLink(item({ id: "5" })), {
    kind: "assignment",
    courseId: "10",
    id: "5",
  });
  assert.equal(todoLink(item({ type: "quiz" })).kind, "quiz");
  assert.equal(todoLink(item({ type: "discussion_topic" })).kind, "discussion");
  assert.deepEqual(
    todoLink(item({ type: "wiki_page", htmlUrl: "https://x.test/p" })),
    { kind: "external", href: "https://x.test/p" },
  );
  assert.equal(todoLink(item({ type: "planner_note" })).kind, "none");
  assert.equal(todoLink(item({ courseId: null })).kind, "none");
});
