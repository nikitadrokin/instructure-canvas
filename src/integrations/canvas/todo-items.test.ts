import assert from "node:assert/strict";
import { test } from "node:test";
import { CanvasClient } from "./client";

const origin = "https://school.instructure.com";

test("to-do items span every course and normalize submission status", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl: URL | undefined;
  globalThis.fetch = async (input) => {
    requestedUrl = new URL(String(input));
    return Response.json([
      {
        course_id: 11,
        context_name: "Biology",
        plannable_id: "2",
        plannable_type: "quiz",
        plannable_date: "2026-10-09T12:00:00Z",
        html_url: "/courses/11/quizzes/2",
        plannable: { title: "Quiz 2", points_possible: 20 },
        planner_override: null,
        submissions: { submitted: false, missing: true },
      },
      {
        course_id: 10,
        context_name: "History",
        plannable_id: "1",
        plannable_type: "assignment",
        plannable_date: "2026-10-07T12:00:00Z",
        html_url: "https://evil.example/courses/10/assignments/1",
        plannable: { title: "Essay", due_at: "2026-10-07T23:59:00Z" },
        planner_override: { marked_complete: true },
        submissions: { submitted: true, graded: true, late: true },
      },
      {
        plannable_id: "3",
        plannable_type: "planner_note",
        plannable_date: null,
        plannable: { title: "Buy a book" },
        submissions: false,
      },
    ]);
  };
  try {
    const items = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getPlannerTodoItems({ startDate: "2026-10-01", endDate: "2026-10-15" });

    assert.equal(requestedUrl?.pathname, "/api/v1/planner/items");
    assert.equal(requestedUrl?.searchParams.has("context_codes[]"), false);
    assert.equal(requestedUrl?.searchParams.get("end_date"), "2026-10-15");

    // Dated items sort by date; undated items go last.
    assert.deepEqual(
      items.map((item) => item.id),
      ["1", "2", "3"],
    );
    const [essay, quiz, note] = items;
    assert.equal(essay.completed, true);
    assert.equal(essay.late, true);
    assert.equal(essay.graded, true);
    assert.equal(essay.courseName, "History");
    // Cross-origin links are dropped rather than followed.
    assert.equal(essay.htmlUrl, null);
    assert.equal(quiz.missing, true);
    assert.equal(quiz.pointsPossible, 20);
    assert.equal(quiz.htmlUrl, `${origin}/courses/11/quizzes/2`);
    assert.equal(quiz.courseId, "11");
    assert.equal(note.courseId, null);
    assert.equal(note.completed, false);
    assert.equal(note.date, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
