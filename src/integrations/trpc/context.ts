import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import {
  getCanvasCredentialsFromRequest,
  getCanvasSessionIdFromRequest,
} from "#/integrations/canvas/session";

export function createTRPCContext({
  req,
  resHeaders,
}: FetchCreateContextFnOptions) {
  return {
    canvasSessionId: getCanvasSessionIdFromRequest(req),
    canvasCredentials: getCanvasCredentialsFromRequest(req),
    resHeaders,
  };
}

export type TRPCContext = ReturnType<typeof createTRPCContext>;
