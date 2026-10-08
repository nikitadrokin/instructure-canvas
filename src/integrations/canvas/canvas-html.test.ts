import assert from "node:assert/strict";
import { test } from "node:test";
import { splitCanvasFilePreviews } from "./canvas-html";

const canvasPdfLink = `
<p>
  <a class="instructure_file_link instructure_scribd_file"
     title="Slide 0 - Course Overview.pdf"
     href="https://school.instructure.com/courses/317/files/569/download?wrap=1"
     target="_blank"
     data-api-endpoint="https://school.instructure.com/api/v1/courses/317/files/569"
     data-api-returntype="File">Slide 0 - Course Overview.pdf</a>
</p>
`;

test("page bodies with Canvas PDF file links become inline previews", () => {
  const parts = splitCanvasFilePreviews(canvasPdfLink, "317");
  const pdf = parts.find((part) => part.kind === "pdf");
  assert.ok(pdf);
  if (pdf?.kind === "pdf") {
    assert.equal(pdf.fileId, "569");
    assert.equal(pdf.courseId, "317");
    assert.equal(pdf.name, "Slide 0 - Course Overview.pdf");
  }
});

test("PDF links keep the course id from the Canvas API endpoint", () => {
  const parts = splitCanvasFilePreviews(canvasPdfLink);
  const pdf = parts.find((part) => part.kind === "pdf");
  assert.equal(pdf?.kind === "pdf" ? pdf.courseId : null, "317");
});

test("non-PDF Canvas file links download through the local proxy", () => {
  const html =
    '<a data-api-returntype="File" data-api-endpoint="https://school.instructure.com/api/v1/courses/1/files/2" href="/courses/1/files/2/download" title="notes.docx">notes.docx</a>';
  const parts = splitCanvasFilePreviews(html, "1");
  assert.equal(parts.length, 1);
  assert.equal(parts[0]?.kind, "html");
  if (parts[0]?.kind === "html") {
    assert.match(
      parts[0].html,
      /\/api\/canvas\/courses\/1\/files\/2\?download=1/,
    );
  }
});

test("Canvas file preview iframes become inline PDF viewers", () => {
  const html =
    '<iframe src="https://school.instructure.com/courses/317/files/569/preview"></iframe>';
  const parts = splitCanvasFilePreviews(html, "317");
  const pdf = parts.find((part) => part.kind === "pdf");
  assert.equal(pdf?.kind === "pdf" ? pdf.fileId : null, "569");
});

test("Canvas PPTX file links become inline presentation previews", () => {
  const html =
    '<a data-api-returntype="File" data-api-endpoint="https://school.instructure.com/api/v1/courses/317/files/700" href="/courses/317/files/700/download" title="Week6.pptx">Week6.pptx</a>';
  const parts = splitCanvasFilePreviews(html, "317");
  const deck = parts.find((part) => part.kind === "pptx");
  assert.equal(deck?.kind === "pptx" ? deck.fileId : null, "700");
  assert.equal(
    parts.some((part) => part.kind === "pdf"),
    false,
  );
});

test("legacy .ppt links are not treated as previewable decks", () => {
  const html =
    '<a data-api-returntype="File" data-api-endpoint="https://school.instructure.com/api/v1/courses/1/files/9" href="/courses/1/files/9/download" title="old.ppt">old.ppt</a>';
  const parts = splitCanvasFilePreviews(html, "1");
  assert.equal(
    parts.some((part) => part.kind === "pptx"),
    false,
  );
});
