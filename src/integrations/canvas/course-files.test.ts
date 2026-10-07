import assert from "node:assert/strict";
import { test } from "node:test";
import { CanvasClient } from "./client";

const origin = "https://school.instructure.com";

test("course folders are listed from the course-scoped folders endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl: URL | undefined;
  globalThis.fetch = async (input) => {
    requestedUrl = new URL(String(input));
    return Response.json([
      { id: 1, name: "course files", full_name: "course files" },
      {
        id: 2,
        name: "Lectures",
        full_name: "course files/Lectures",
        parent_folder_id: 1,
        files_count: 3,
      },
    ]);
  };
  try {
    const folders = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCourseFolders("10");
    assert.equal(requestedUrl?.pathname, "/api/v1/courses/10/folders");
    assert.deepEqual(
      folders.map((folder) => [folder.id, folder.parent_folder_id ?? null]),
      [
        ["1", null],
        ["2", "1"],
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("folder files resolve the folder through the course before listing", async () => {
  const originalFetch = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    paths.push(url.pathname);
    if (url.pathname === "/api/v1/courses/10/folders/2")
      return Response.json({ id: 2, name: "Lectures" });
    return Response.json([{ id: 5, display_name: "week-1.pdf", size: 10 }]);
  };
  try {
    const files = await new CanvasClient({
      baseUrl: origin,
      accessToken: "test",
    }).getCourseFolderFiles("10", "2");
    assert.deepEqual(paths, [
      "/api/v1/courses/10/folders/2",
      "/api/v1/folders/2/files",
    ]);
    assert.equal(files[0].display_name, "week-1.pdf");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("folders outside the course never reach the folder files endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    paths.push(new URL(String(input)).pathname);
    return Response.json({ message: "not found" }, { status: 404 });
  };
  try {
    await assert.rejects(
      new CanvasClient({
        baseUrl: origin,
        accessToken: "test",
      }).getCourseFolderFiles("10", "99"),
    );
    assert.deepEqual(paths, ["/api/v1/courses/10/folders/99"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
