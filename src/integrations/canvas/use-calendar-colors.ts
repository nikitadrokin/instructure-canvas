import { useQuery } from "@tanstack/react-query";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Saved Canvas calendar colors, keyed by context code such as `course_42`.
 * Falls back to an empty map so the UI can hash a palette instead.
 */
export function useCalendarColors() {
  const trpc = useTRPC();
  const sessionReady = useCanvasStore((state) => state.sessionReady);

  return useQuery(
    trpc.canvas.calendarColors.queryOptions(undefined, {
      enabled: sessionReady,
      retry: false,
      staleTime: 30 * 60_000,
      gcTime: 60 * 60_000,
    }),
  );
}
