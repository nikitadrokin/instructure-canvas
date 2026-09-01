import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "#/integrations/trpc/init";
import { normalizeCanvasBaseUrl } from "./auth";
import { CanvasApiError, CanvasClient, getCanvasDashboard } from "./client";
import {
	createCanvasSession,
	createSessionCookie,
	destroyCanvasSession,
	getCanvasSession,
} from "./session";

const canvasCredentialsSchema = z.object({
	canvasUrl: z.string().trim().min(1, "Enter your Canvas domain."),
	token: z.string().trim().min(1, "Enter a personal access token."),
});

function toTrpcError(error: unknown) {
	if (!(error instanceof CanvasApiError)) {
		return new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "The Canvas connection failed unexpectedly.",
			cause: error,
		});
	}

	const code =
		error.status === 400
			? "BAD_REQUEST"
			: error.status === 401
				? "UNAUTHORIZED"
				: error.status === 403
					? "FORBIDDEN"
					: error.status === 429
						? "TOO_MANY_REQUESTS"
						: "BAD_GATEWAY";

	return new TRPCError({ code, message: error.message, cause: error });
}

export const canvasRouter = createTRPCRouter({
	connect: publicProcedure
		.input(canvasCredentialsSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const dashboard = await getCanvasDashboard(input);
				destroyCanvasSession(ctx.canvasSessionId);
				const sessionId = createCanvasSession(input);
				ctx.resHeaders.append("Set-Cookie", createSessionCookie(sessionId));
				return dashboard;
			} catch (error) {
				throw toTrpcError(error);
			}
		}),
	dashboard: publicProcedure.query(async ({ ctx }) => {
		const session = getCanvasSession(ctx.canvasSessionId);
		if (!session) return null;

		try {
			return await getCanvasDashboard(session);
		} catch (error) {
			throw toTrpcError(error);
		}
	}),
	courseDetail: publicProcedure
		.input(z.object({ courseId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const session = getCanvasSession(ctx.canvasSessionId);
			if (!session)
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Connect to Canvas to view a course.",
				});
			const client = new CanvasClient({
				baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
				accessToken: session.token,
			});
			try {
				return await client.getCourseDetail(input.courseId);
			} catch (error) {
				throw toTrpcError(error);
			} finally {
				client.forgetCredentials();
			}
		}),
	disconnect: publicProcedure.mutation(({ ctx }) => {
		destroyCanvasSession(ctx.canvasSessionId);
		ctx.resHeaders.append("Set-Cookie", createSessionCookie(null));
		return { disconnected: true };
	}),
});
