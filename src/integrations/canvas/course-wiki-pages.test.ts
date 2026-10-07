import assert from "node:assert/strict";
import { test } from "node:test";
import { CanvasClient } from "./client";

const origin = "https://school.instructure.com";

test("course pages are listed by title without bodies", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl: URL | undefined;
  globalThis.fetch = async (input) => {
    requestedUrl = new URL(String(input));
    return Response.json([
      {
        page_id: 1,
        url: "course-policies",
        title: "Course policies",
        updated_at: "2026-09-01T00:00:00Z",
        front_page: true,
      },
    ]);
  };
  try {
    const pages = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCoursePages("10");
    assert.equal(requestedUrl?.pathname, "/api/v1/courses/10/pages");
    assert.equal(requestedUrl?.searchParams.get("sort"), "title");
    assert.equal(requestedUrl?.searchParams.has("include[]"), false);
    assert.equal(pages[0].url, "course-policies");
    assert.equal(pages[0].front_page, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
