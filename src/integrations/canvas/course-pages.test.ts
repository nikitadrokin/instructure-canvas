import assert from "node:assert/strict";
import { test } from "node:test";
import { CanvasClient } from "./client";

const origin = "https://school.instructure.com";
test("assignment readers accept absent optional quiz and upload data", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      id: 1,
      name: "Homework",
      allowed_extensions: null,
      allowed_attempts: null,
      quiz_id: null,
      submission: { preview_url: null },
    });
  try {
    const assignment = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCourseAssignment("10", "1");
    assert.equal(assignment.name, "Homework");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("assignment readers accept null rubric scoring flags", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      id: 1,
      name: "Rubric assignment",
      rubric: [
        {
          id: "criterion-1",
          description: "Criterion",
          points: 10,
          ignore_for_scoring: null,
        },
      ],
    });
  try {
    const assignment = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCourseAssignment("10", "1");
    assert.equal(assignment.rubric?.[0].ignore_for_scoring, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("invalid rows fail explicitly instead of silently disappearing from grades", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json([
      { id: 1, title: "Quiz" },
      { id: 2, title: null },
    ]);
  try {
    await assert.rejects(
      new CanvasClient({
        baseUrl: origin,
        accessToken: "test",
      }).getCourseSection("10", "quizzes"),
      /unexpected quizzes \(title\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("course roster follows pagination and retains enrollment roles", async () => {
  const originalFetch = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    paths.push(url.pathname + url.search);
    return paths.length === 1
      ? Response.json(
          [{ id: 1, name: "A", enrollments: [{ role: "StudentEnrollment" }] }],
          {
            headers: {
              link: `<${origin}/api/v1/courses/10/users?page=2>; rel="next"`,
            },
          },
        )
      : Response.json([{ id: 2, name: "B", enrollments: null }]);
  };
  try {
    const data = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCourseSection("10", "people");
    assert.equal(data.kind, "people");
    if (data.kind === "people")
      assert.deepEqual(
        data.items.map((person) => person.id),
        ["1", "2"],
      );
    assert.equal(paths.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("grades request only the authenticated user's enrollments and include submissions", async () => {
  const originalFetch = globalThis.fetch;
  const paths: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    paths.push(url);
    if (url.pathname.endsWith("/users/self"))
      return Response.json({ id: 9, name: "Student" });
    if (url.pathname.endsWith("/enrollments"))
      return Response.json([
        { type: "StudentEnrollment", grades: { current_score: 0 } },
      ]);
    return Response.json([
      {
        id: 1,
        name: "Work",
        points_possible: 10,
        submission: { score: 0, workflow_state: "graded" },
      },
    ]);
  };
  try {
    const data = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCourseSection("10", "grades");
    assert.equal(
      paths
        .find((url) => url.pathname.endsWith("/enrollments"))
        ?.searchParams.get("user_id"),
      "9",
    );
    assert.equal(
      paths
        .find((url) => url.pathname.endsWith("/assignments"))
        ?.searchParams.get("include[]"),
      "submission",
    );
    assert.equal(data.kind, "grades");
    if (data.kind === "grades")
      assert.equal(data.assignments[0].submission?.score, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("tool launch rejects URLs outside the connected Canvas origin", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({ url: "https://untrusted.example/launch" });
  try {
    await assert.rejects(
      new CanvasClient({ baseUrl: origin, accessToken: "test" }).getToolLaunch(
        "10",
        "1",
      ),
      /unsupported tool launch URL/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("course planner is scoped to the course and normalizes completion", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl: URL | undefined;
  globalThis.fetch = async (input) => {
    requestedUrl = new URL(String(input));
    return Response.json([
      {
        plannable_id: 7,
        plannable_type: "assignment",
        plannable_date: "2026-09-30T12:00:00Z",
        html_url: "/courses/10/assignments/7",
        plannable: { title: "Weekly reflection", due_at: null },
        planner_override: { marked_complete: true },
        submissions: false,
      },
    ]);
  };
  try {
    const items = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCoursePlannerItems({
      courseId: "10",
      startDate: "2026-09-28",
      endDate: "2026-10-04",
    });

    assert.equal(requestedUrl?.pathname, "/api/v1/planner/items");
    assert.equal(
      requestedUrl?.searchParams.get("context_codes[]"),
      "course_10",
    );
    assert.equal(requestedUrl?.searchParams.get("start_date"), "2026-09-28");
    assert.equal(requestedUrl?.searchParams.get("end_date"), "2026-10-04");
    assert.deepEqual(items, [
      {
        id: "7",
        type: "assignment",
        title: "Weekly reflection",
        date: "2026-09-30T12:00:00Z",
        htmlUrl: `${origin}/courses/10/assignments/7`,
        completed: true,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
