import { randomUUID } from "node:crypto";

export const CANVAS_SESSION_COOKIE = "canvas-local-session";

interface CanvasSession {
  canvasUrl: string;
  expiresAt: number;
  token: string;
}

const SESSION_TTL = 8 * 60 * 60 * 1_000;
const sessions = new Map<string, CanvasSession>();

function removeExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
}

export function createCanvasSession(credentials: {
  canvasUrl: string;
  token: string;
}) {
  removeExpiredSessions();
  const id = randomUUID();
  sessions.set(id, { ...credentials, expiresAt: Date.now() + SESSION_TTL });
  return id;
}

export function getCanvasSession(id: string | null) {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }

  session.expiresAt = Date.now() + SESSION_TTL;
  return { canvasUrl: session.canvasUrl, token: session.token };
}

export function destroyCanvasSession(id: string | null) {
  if (id) sessions.delete(id);
}

function getCookie(header: string | null, name: string) {
  if (!header) return null;

  for (const item of header.split(";")) {
    const [key, ...valueParts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }

  return null;
}

export function getCanvasSessionIdFromRequest(request: Request) {
  return getCookie(request.headers.get("cookie"), CANVAS_SESSION_COOKIE);
}

/**
 * Browser requests use these same-origin headers while the HttpOnly session
 * cookie is being restored (and as a fallback when the dev server reloads and
 * loses its in-memory session map).
 */
export function getCanvasCredentialsFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const canvasUrl = request.headers.get("x-canvas-url");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  return canvasUrl && token ? { canvasUrl, token } : null;
}

export function createSessionCookie(id: string | null) {
  const parts = [
    `${CANVAS_SESSION_COOKIE}=${id ? encodeURIComponent(id) : ""}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Strict",
    id ? `Max-Age=${SESSION_TTL / 1_000}` : "Max-Age=0",
  ];

  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
