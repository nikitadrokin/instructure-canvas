import { useQuery } from "@tanstack/react-query";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentWeekRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

export function useCoursePlanner(courseId: string) {
  const trpc = useTRPC();
  const sessionReady = useCanvasStore((state) => state.sessionReady);
  const range = currentWeekRange();

  return useQuery(
    trpc.canvas.coursePlanner.queryOptions(
      { courseId, ...range },
      {
        enabled: Boolean(courseId) && sessionReady,
        retry: false,
        staleTime: 60_000,
        gcTime: 30 * 60_000,
      },
    ),
  );
}
