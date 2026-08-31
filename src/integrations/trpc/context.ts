import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { CANVAS_SESSION_COOKIE } from "#/integrations/canvas/session";

function getCookie(header: string | null, name: string) {
	if (!header) return null;

	for (const item of header.split(";")) {
		const [key, ...valueParts] = item.trim().split("=");
		if (key === name) return decodeURIComponent(valueParts.join("="));
	}

	return null;
}

export function createTRPCContext({
	req,
	resHeaders,
}: FetchCreateContextFnOptions) {
	return {
		canvasSessionId: getCookie(
			req.headers.get("cookie"),
			CANVAS_SESSION_COOKIE,
		),
		resHeaders,
	};
}

export type TRPCContext = ReturnType<typeof createTRPCContext>;
