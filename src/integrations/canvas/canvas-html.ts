import { canvasFileContentPath, isCanvasId } from "./file-paths";

/** A Canvas file embedded in rich content that gets an inline viewer. */
export type CanvasFilePart = {
  kind: "pdf" | "pptx";
  courseId: string;
  fileId: string;
  name: string;
};

export type CanvasHtmlPart =
  | { kind: "html"; html: string }
  | (CanvasFilePart & { kind: "pdf" })
  | (CanvasFilePart & { kind: "pptx" });

const NODE_RE =
  /<a\b[^>]*>[\s\S]*?<\/a>|<iframe\b[^>]*(?:\/>|>[\s\S]*?<\/iframe>)?/gi;
const ATTR_RE = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
const FILE_PATH_RE = /\/(?:api\/v1\/)?(?:courses\/(\d+)\/)?files\/(\d+)/i;
const NON_PDF_EXT_RE =
  /\.(docx?|pptx?|xlsx?|zip|png|jpe?g|gif|webp|mp4|webm|mov|txt|rtf|csv|html?)(?:$|[?#])/i;

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(html: string) {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getAttrs(openTag: string) {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let match = ATTR_RE.exec(openTag);
  while (match) {
    const name = match[1]?.toLowerCase();
    if (name && !name.startsWith("<")) {
      attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
    }
    match = ATTR_RE.exec(openTag);
  }
  return attrs;
}

function parseFileRef(url: string | undefined) {
  if (!url) return {};
  const match = url.match(FILE_PATH_RE);
  if (!match) return {};
  const courseId = match[1];
  const fileId = match[2];
  return {
    courseId: courseId && isCanvasId(courseId) ? courseId : undefined,
    fileId: fileId && isCanvasId(fileId) ? fileId : undefined,
  };
}

function fileRefFromAttrs(attrs: Record<string, string>) {
  const fromEndpoint = parseFileRef(attrs["data-api-endpoint"]);
  const fromHref = parseFileRef(attrs.href ?? attrs.src);
  return {
    courseId: fromEndpoint.courseId ?? fromHref.courseId,
    fileId: fromEndpoint.fileId ?? fromHref.fileId,
  };
}

function looksLikePdf(attrs: Record<string, string>, text: string) {
  const haystack = `${attrs.title ?? ""} ${attrs.href ?? ""} ${attrs.src ?? ""} ${attrs["data-filename"] ?? ""} ${text}`;
  return /\.pdf(?:$|[?#\s"'])/i.test(haystack);
}

function looksLikePptx(attrs: Record<string, string>, text: string) {
  const haystack = `${attrs.title ?? ""} ${attrs.href ?? ""} ${attrs.src ?? ""} ${attrs["data-filename"] ?? ""} ${text}`;
  return /\.pptx(?:$|[?#\s"'])/i.test(haystack);
}

function isCanvasFileNode(attrs: Record<string, string>) {
  const returnType = attrs["data-api-returntype"]?.replace(/[[\]]/g, "");
  if (returnType?.toLowerCase() === "file") return true;
  return Boolean(fileRefFromAttrs(attrs).fileId);
}

function shouldPreviewAsPdf(
  tag: "a" | "iframe",
  attrs: Record<string, string>,
  text: string,
) {
  if (looksLikePdf(attrs, text)) return true;
  if (tag !== "iframe") return false;
  const haystack = `${attrs.src ?? ""} ${attrs.title ?? ""} ${attrs["data-filename"] ?? ""}`;
  return (
    Boolean(fileRefFromAttrs(attrs).fileId) && !NON_PDF_EXT_RE.test(haystack)
  );
}

function rewriteHref(tag: string, href: string) {
  if (/\bhref\s*=/i.test(tag)) {
    return tag.replace(
      /\bhref\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
      `href="${href}"`,
    );
  }
  return tag.replace(/^<a\b/i, `<a href="${href}"`);
}

function parseNode(
  node: string,
  fallbackCourseId?: string,
): CanvasHtmlPart | { kind: "html"; html: string } {
  const tag = /^<iframe\b/i.test(node) ? "iframe" : "a";
  const open = node.match(new RegExp(`^<${tag}\\b([^>]*)>`, "i"))?.[1];
  if (!open) return { kind: "html", html: node };
  const attrs = getAttrs(open);
  if (!isCanvasFileNode(attrs)) return { kind: "html", html: node };

  const ref = fileRefFromAttrs(attrs);
  const fileId = ref.fileId;
  const courseId = ref.courseId ?? fallbackCourseId;
  if (!fileId || !courseId || !isCanvasId(courseId)) {
    return { kind: "html", html: node };
  }

  const text = stripTags(node);
  const asPptx = looksLikePptx(attrs, text);
  const name =
    stripTags(attrs.title ?? "") ||
    text ||
    attrs["data-filename"] ||
    (asPptx
      ? "Presentation"
      : shouldPreviewAsPdf(tag, attrs, text)
        ? "PDF"
        : "File");

  if (asPptx) {
    return { kind: "pptx", courseId, fileId, name };
  }

  if (shouldPreviewAsPdf(tag, attrs, text)) {
    return { kind: "pdf", courseId, fileId, name };
  }

  if (tag === "iframe") {
    return {
      kind: "html",
      html: `<a href="${canvasFileContentPath(courseId, fileId, true)}" target="_blank" rel="noreferrer">${name}</a>`,
    };
  }

  return {
    kind: "html",
    html: rewriteHref(node, canvasFileContentPath(courseId, fileId, true)),
  };
}

/**
 * Pulls Canvas File links that point at PDFs or PPTX decks out of API HTML so
 * the UI can render them with the local viewers instead of sending the browser to Canvas.
 * Other File links are rewritten onto the same-origin download proxy.
 */
export function splitCanvasFilePreviews(
  html: string,
  fallbackCourseId?: string,
): CanvasHtmlPart[] {
  const parts: CanvasHtmlPart[] = [];
  NODE_RE.lastIndex = 0;
  let last = 0;
  let match = NODE_RE.exec(html);
  while (match) {
    const parsed = parseNode(match[0], fallbackCourseId);
    if (parsed.kind !== "html" || parsed.html !== match[0]) {
      if (match.index > last) {
        parts.push({ kind: "html", html: html.slice(last, match.index) });
      }
      parts.push(parsed);
      last = match.index + match[0].length;
    }
    match = NODE_RE.exec(html);
  }
  if (last < html.length) {
    parts.push({ kind: "html", html: html.slice(last) });
  }
  return parts.length ? parts : [{ kind: "html", html }];
}
