import { canvasRouter } from "#/integrations/canvas/router";

import { createTRPCRouter } from "./init";

export const trpcRouter = createTRPCRouter({
	canvas: canvasRouter,
});
export type TRPCRouter = typeof trpcRouter;
