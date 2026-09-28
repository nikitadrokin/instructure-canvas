export function isCanvasId(value: string) {
  return /^\d+$/.test(value);
}

export function isCanvasPdfFile(file: {
  mime_class?: string;
  "content-type"?: string;
  filename?: string;
  display_name?: string;
}) {
  return (
    file.mime_class === "pdf" ||
    file["content-type"] === "application/pdf" ||
    Boolean(file.filename?.toLowerCase().endsWith(".pdf")) ||
    Boolean(file.display_name?.toLowerCase().endsWith(".pdf"))
  );
}

export function canvasFileContentPath(
  courseId: string,
  fileId: string,
  download = false,
) {
  const path = `/api/canvas/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(fileId)}`;
  return download ? `${path}?download=1` : path;
}

export function contentDisposition(
  type: "inline" | "attachment",
  filename: string,
) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
