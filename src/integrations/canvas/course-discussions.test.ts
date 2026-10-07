import assert from "node:assert/strict";
import { test } from "node:test";
import { CanvasClient } from "./client";

const origin = "https://school.instructure.com";

test("discussion topics are requested by recent activity and normalized", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl: URL | undefined;
  globalThis.fetch = async (input) => {
    requestedUrl = new URL(String(input));
    return Response.json([
      {
        id: 4,
        title: "Week 1 reflection",
        message: null,
        discussion_subentry_count: 3,
        unread_count: 1,
        read_state: "unread",
        pinned: true,
        locked: false,
        last_reply_at: "2026-10-01T12:00:00Z",
        author: { id: 8, display_name: "Prof" },
        assignment_id: null,
      },
    ]);
  };
  try {
    const topics = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCourseDiscussionTopics("10");
    assert.equal(
      requestedUrl?.pathname,
      "/api/v1/courses/10/discussion_topics",
    );
    assert.equal(requestedUrl?.searchParams.get("order_by"), "recent_activity");
    assert.equal(topics[0].id, "4");
    assert.equal(topics[0].unread_count, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a malformed discussion topic fails explicitly", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json([{ id: 1, title: null }]);
  try {
    await assert.rejects(
      new CanvasClient({
        baseUrl: origin,
        accessToken: "test",
      }).getCourseDiscussionTopics("10"),
      /unexpected discussion topics/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
