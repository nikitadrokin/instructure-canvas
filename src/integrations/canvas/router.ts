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

function devLog(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[canvas:session] ${event}`, details);
  }
}

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
  toolLaunch: publicProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        toolId: z.string().regex(/^\d+$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      const session =
        getCanvasSession(ctx.canvasSessionId) ?? ctx.canvasCredentials;
      if (!session)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Connect to Canvas to open this tool.",
        });
      const client = new CanvasClient({
        baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
        accessToken: session.token,
      });
      try {
        return await client.getToolLaunch(input.courseId, input.toolId);
      } catch (error) {
        throw toTrpcError(error);
      } finally {
        client.forgetCredentials();
      }
    }),
  courseSection: publicProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        section: z.enum(["quizzes", "people", "grades"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const session =
        getCanvasSession(ctx.canvasSessionId) ?? ctx.canvasCredentials;
      if (!session)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Connect to Canvas to view this course.",
        });
      const client = new CanvasClient({
        baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
        accessToken: session.token,
      });
      try {
        return await client.getCourseSection(input.courseId, input.section);
      } catch (error) {
        throw toTrpcError(error);
      } finally {
        client.forgetCredentials();
      }
    }),
  courseResource: publicProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        id: z.string().min(1),
        kind: z.enum(["assignment", "quiz"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const session =
        getCanvasSession(ctx.canvasSessionId) ?? ctx.canvasCredentials;
      if (!session)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Connect to Canvas to view this course.",
        });
      const client = new CanvasClient({
        baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
        accessToken: session.token,
      });
      try {
        if (input.kind === "assignment")
          return {
            kind: "assignment" as const,
            assignment: await client.getCourseAssignment(
              input.courseId,
              input.id,
            ),
          };
        return {
          kind: "quiz" as const,
          quiz: await client.getCourseQuiz(input.courseId, input.id),
        };
      } catch (error) {
        throw toTrpcError(error);
      } finally {
        client.forgetCredentials();
      }
    }),
  restoreSession: publicProcedure
    .input(canvasCredentialsSchema)
    .mutation(({ ctx, input }) => {
      devLog("restoring browser credentials", {
        hadSession: Boolean(ctx.canvasSessionId),
        canvasHost: new URL(normalizeCanvasBaseUrl(input.canvasUrl)).hostname,
      });
      destroyCanvasSession(ctx.canvasSessionId);
      const sessionId = createCanvasSession(input);
      ctx.resHeaders.append("Set-Cookie", createSessionCookie(sessionId));
      devLog("session restored", { sessionCreated: true });
      return { restored: true };
    }),
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
      const storedSession = getCanvasSession(ctx.canvasSessionId);
      const session = storedSession ?? ctx.canvasCredentials;
      devLog("course detail session check", {
        courseId: input.courseId,
        hasCookie: Boolean(ctx.canvasSessionId),
        hasSession: Boolean(storedSession),
        hasRequestCredentials: Boolean(ctx.canvasCredentials),
        credentialSource: storedSession
          ? "session"
          : ctx.canvasCredentials
            ? "request headers"
            : "none",
      });
      if (!session) {
        devLog("course detail blocked", {
          courseId: input.courseId,
          reason: "missing server session",
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Connect to Canvas to view a course.",
        });
      }
      const client = new CanvasClient({
        baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
        accessToken: session.token,
      });
      try {
        const detail = await client.getCourseDetail(input.courseId);
        devLog("course detail loaded", {
          courseId: input.courseId,
          tabCount: detail.tabs.length,
          issueCount: detail.issues.length,
        });
        return detail;
      } catch (error) {
        devLog("course detail failed", {
          courseId: input.courseId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw toTrpcError(error);
      } finally {
        client.forgetCredentials();
      }
    }),
  calendarEvents: publicProcedure
    .input(
      z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        contextCodes: z
          .array(z.string().regex(/^(user|course|group)_\d+$/))
          .max(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startMs = Date.parse(`${input.startDate}T00:00:00`);
      const endMs = Date.parse(`${input.endDate}T00:00:00`);
      if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a valid calendar date range.",
        });
      }
      if ((endMs - startMs) / 86_400_000 > 62) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Calendar range is too large.",
        });
      }

      const session =
        getCanvasSession(ctx.canvasSessionId) ?? ctx.canvasCredentials;
      if (!session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Connect to Canvas to view the calendar.",
        });
      }

      const client = new CanvasClient({
        baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
        accessToken: session.token,
      });
      try {
        return await client.getCalendarEvents(input);
      } catch (error) {
        throw toTrpcError(error);
      } finally {
        client.forgetCredentials();
      }
    }),
  calendarColors: publicProcedure.query(async ({ ctx }) => {
    const session =
      getCanvasSession(ctx.canvasSessionId) ?? ctx.canvasCredentials;
    if (!session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Connect to Canvas to view the calendar.",
      });
    }

    const client = new CanvasClient({
      baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
      accessToken: session.token,
    });
    try {
      return await client.getCustomColors();
    } catch (error) {
      if (
        error instanceof CanvasApiError &&
        (error.status === 403 || error.status === 404)
      ) {
        return {};
      }
      throw toTrpcError(error);
    } finally {
      client.forgetCredentials();
    }
  }),
  moduleItemContent: publicProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        type: z.string().min(1),
        contentId: z.string().optional(),
        pageUrl: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const session =
        getCanvasSession(ctx.canvasSessionId) ?? ctx.canvasCredentials;
      if (!session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Connect to Canvas to view this item.",
        });
      }
      const client = new CanvasClient({
        baseUrl: normalizeCanvasBaseUrl(session.canvasUrl),
        accessToken: session.token,
      });
      try {
        return await client.getModuleItemContent(input.courseId, {
          type: input.type,
          contentId: input.contentId,
          pageUrl: input.pageUrl,
        });
      } catch (error) {
        devLog("module item content failed", {
          courseId: input.courseId,
          type: input.type,
          error: error instanceof Error ? error.message : "Unknown error",
        });
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
