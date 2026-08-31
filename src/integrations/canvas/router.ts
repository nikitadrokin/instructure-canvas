import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "#/integrations/trpc/init";

import { CanvasApiError, getCanvasDashboard } from "./client";

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
	dashboard: publicProcedure
		.input(canvasCredentialsSchema)
		.mutation(async ({ input }) => {
			try {
				return await getCanvasDashboard(input);
			} catch (error) {
				throw toTrpcError(error);
			}
		}),
});
