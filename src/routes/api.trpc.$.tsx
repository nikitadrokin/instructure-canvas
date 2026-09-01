import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "#/integrations/trpc/context";
import { trpcRouter } from "#/integrations/trpc/router";

async function handler({ request }: { request: Request }) {
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return new Response("Cross-origin requests are not allowed.", {
			status: 403,
		});
	}

	const response = await fetchRequestHandler({
		req: request,
		router: trpcRouter,
		endpoint: "/api/trpc",
		createContext: createTRPCContext,
		allowMethodOverride: true,
	});

	const headers = new Headers(response.headers);
	headers.set("Cache-Control", "no-store");
	headers.append("Vary", "Cookie");
	return new Response(response.body, { status: response.status, headers });
}

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
		},
	},
});
