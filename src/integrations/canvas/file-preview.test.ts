import assert from "node:assert/strict";
import { test } from "node:test";
import { CanvasApiError } from "./auth";
import {
  canvasFileContentPath,
  contentDisposition,
  isCanvasId,
} from "./file-paths";
import { fetchCanvasFileBytes } from "./file-preview";
import { getCanvasCredentialsFromRequest } from "./session";

test("course file paths stay same-origin and mark downloads", () => {
  assert.equal(
    canvasFileContentPath("12", "34"),
    "/api/canvas/courses/12/files/34",
  );
  assert.equal(
    canvasFileContentPath("12", "34", true),
    "/api/canvas/courses/12/files/34?download=1",
  );
  assert.equal(isCanvasId("569"), true);
  assert.equal(isCanvasId("abc"), false);
});

test("inline content-disposition does not force a download", () => {
  const header = contentDisposition("inline", 'Lecture 1: "Intro".pdf');
  assert.match(header, /^inline;/);
  assert.doesNotMatch(header, /attachment/);
});

test("same-origin PDF requests can reuse the browser's Canvas credentials", () => {
  const request = new Request(
    "http://localhost/api/canvas/courses/12/files/34",
    {
      headers: {
        Authorization: "Bearer secret-token",
        "X-Canvas-Url": "https://school.instructure.com",
      },
    },
  );

  assert.deepEqual(getCanvasCredentialsFromRequest(request), {
    canvasUrl: "https://school.instructure.com",
    token: "secret-token",
  });
});

test("file byte fetch refuses http and credentialed URLs", async () => {
  await assert.rejects(
    () =>
      fetchCanvasFileBytes({
        previewUrl: "http://files.example.com/file.pdf",
        canvasOrigin: "https://school.instructure.com",
        accessToken: "token",
        lookup: async () => [{ address: "8.8.8.8", family: 4 }],
      }),
    CanvasApiError,
  );
  await assert.rejects(
    () =>
      fetchCanvasFileBytes({
        previewUrl: "https://user:pass@files.example.com/file.pdf",
        canvasOrigin: "https://school.instructure.com",
        accessToken: "token",
        lookup: async () => [{ address: "8.8.8.8", family: 4 }],
      }),
    CanvasApiError,
  );
});

test("file byte fetch refuses private destinations", async () => {
  await assert.rejects(
    () =>
      fetchCanvasFileBytes({
        previewUrl: "https://files.example.com/file.pdf",
        canvasOrigin: "https://school.instructure.com",
        accessToken: "token",
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
      }),
    /public HTTPS Canvas domain/,
  );
});
