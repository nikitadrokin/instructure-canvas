import { useQuery } from "@tanstack/react-query";

import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Course detail query shared by the course layout and its child pages.
 * Every caller uses the same key and options so React Query dedupes.
 */
export function useCourseDetail(courseId: string) {
	const trpc = useTRPC();
	const sessionReady = useCanvasStore((state) => state.sessionReady);

	return useQuery(
		trpc.canvas.courseDetail.queryOptions(
			{ courseId },
			{
				enabled: Boolean(courseId) && sessionReady,
				retry: false,
				staleTime: 5 * 60_000,
				gcTime: 60 * 60_000,
			},
		),
	);
}
