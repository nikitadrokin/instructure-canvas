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
