import { useQuery } from "@tanstack/react-query";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Month-scoped calendar query. Shares one key per range so month navigation
 * does not refetch an already-loaded window.
 */
export function useCalendarEvents(input: {
  startDate: string;
  endDate: string;
  contextCodes: string[];
}) {
  const trpc = useTRPC();
  const sessionReady = useCanvasStore((state) => state.sessionReady);

  return useQuery(
    trpc.canvas.calendarEvents.queryOptions(input, {
      enabled: sessionReady && input.contextCodes.length > 0,
      retry: false,
      staleTime: 60_000,
      gcTime: 30 * 60_000,
    }),
  );
}
