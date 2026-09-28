import {
  assertPublicCanvasHostname,
  CanvasApiError,
  type HostnameLookup,
} from "./auth";

const MAX_FILE_BYTES = 80 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 60_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isSafeHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url;
}

function limitStream(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): ReadableStream<Uint8Array> {
  let seen = 0;
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > maxBytes) {
          controller.error(
            new CanvasApiError("This file is too large to preview.", 413),
          );
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

async function fetchHop(
  url: URL,
  authorization: string | undefined,
  lookup: HostnameLookup | undefined,
): Promise<Response> {
  await assertPublicCanvasHostname(url.hostname, lookup);
  const headers = new Headers({ Accept: "*/*" });
  if (authorization) headers.set("Authorization", `Bearer ${authorization}`);

  try {
    return await fetch(url, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof CanvasApiError) throw error;
    throw new CanvasApiError("Could not download that Canvas file.", 502);
  }
}

/**
 * Follows Canvas/S3 redirects for a file preview. The Canvas token is only
 * sent to the institution origin, never to S3 or InstFS.
 */
export async function fetchCanvasFileBytes(input: {
  previewUrl?: string | null;
  downloadUrl?: string | null;
  canvasOrigin: string;
  accessToken: string;
  lookup?: HostnameLookup;
}): Promise<{
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: string | null;
}> {
  const startUrl = input.previewUrl || input.downloadUrl;
  if (!startUrl) {
    throw new CanvasApiError("This file has no download link.", 404);
  }

  let current = isSafeHttpUrl(startUrl);
  if (!current) {
    throw new CanvasApiError("Canvas returned an unsafe file URL.", 502);
  }

  let authorization: string | undefined =
    current.origin === input.canvasOrigin ? input.accessToken : undefined;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetchHop(current, authorization, input.lookup);
    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new CanvasApiError("Canvas returned an unsafe file URL.", 502);
      }
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new CanvasApiError("Canvas returned an unsafe file URL.", 502);
      }
      if (next.protocol !== "https:" || next.username || next.password) {
        throw new CanvasApiError("Canvas returned an unsafe file URL.", 502);
      }
      current = next;
      authorization = undefined;
      continue;
    }

    if (!response.ok || !response.body) {
      throw new CanvasApiError(
        "Canvas could not complete the request.",
        response.status >= 400 && response.status < 600 ? response.status : 502,
      );
    }

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader) {
      const length = Number(lengthHeader);
      if (Number.isFinite(length) && length > MAX_FILE_BYTES) {
        throw new CanvasApiError("This file is too large to preview.", 413);
      }
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/octet-stream";

    return {
      body: limitStream(response.body, MAX_FILE_BYTES),
      contentType,
      contentLength: lengthHeader,
    };
  }

  throw new CanvasApiError("Canvas returned an unsafe file URL.", 502);
}
