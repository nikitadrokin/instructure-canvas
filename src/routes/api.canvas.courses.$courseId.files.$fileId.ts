import { createFileRoute } from "@tanstack/react-router";
import { normalizeCanvasBaseUrl } from "#/integrations/canvas/auth";
import { CanvasApiError, CanvasClient } from "#/integrations/canvas/client";
import {
  contentDisposition,
  isCanvasId,
} from "#/integrations/canvas/file-paths";
import { fetchCanvasFileBytes } from "#/integrations/canvas/file-preview";
import {
  getCanvasCredentialsFromRequest,
  getCanvasSession,
  getCanvasSessionIdFromRequest,
} from "#/integrations/canvas/session";

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function handler({
  request,
  params,
}: {
  request: Request;
  params: { courseId: string; fileId: string };
}) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return jsonError("Cross-origin requests are not allowed.", 403);
  }

  if (!isCanvasId(params.courseId) || !isCanvasId(params.fileId)) {
    return jsonError("That file could not be found.", 400);
  }

  const session =
    getCanvasSession(getCanvasSessionIdFromRequest(request)) ??
    getCanvasCredentialsFromRequest(request);
  if (!session) {
    return jsonError("Connect to Canvas to view this file.", 401);
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const client = new CanvasClient({
    baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
    accessToken: session.token,
  });

  try {
    const file = await client
      .getCourseFile(params.courseId, params.fileId)
      .catch((error) => {
        if (error instanceof CanvasApiError && error.status === 404) {
          return client.getFile(params.fileId);
        }
        throw error;
      });
    let previewUrl: string | null = null;
    try {
      previewUrl = (await client.getFilePublicUrl(file.id)).public_url ?? null;
    } catch {
      previewUrl = null;
    }

    const upstream = await fetchCanvasFileBytes({
      previewUrl,
      downloadUrl: file.url ?? null,
      canvasOrigin: normalizeCanvasBaseUrl(session.canvasUrl),
      accessToken: session.token,
    });

    const type =
      file["content-type"] ||
      upstream.contentType ||
      "application/octet-stream";
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": contentDisposition(
        download ? "attachment" : "inline",
        file.display_name || file.filename || "file",
      ),
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
    });
    if (upstream.contentLength) {
      headers.set("Content-Length", upstream.contentLength);
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof CanvasApiError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("The Canvas connection failed unexpectedly.", 502);
  } finally {
    client.forgetCredentials();
  }
}

export const Route = createFileRoute(
  "/api/canvas/courses/$courseId/files/$fileId",
)({
  server: {
    handlers: {
      GET: handler,
    },
  },
});
