import { createFileRoute, redirect } from "@tanstack/react-router";
import { CourseOverview } from "@/components/courses/course-detail";
import { getCourseScore } from "@/components/dashboard/shared";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";

export const Route = createFileRoute("/courses/$courseId/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: "assignments" | "announcements" } => ({
    view:
      search.view === "assignments" || search.view === "announcements"
        ? search.view
        : undefined,
  }),
  beforeLoad: ({ search, params }) => {
    if (search.view)
      throw redirect({
        to:
          search.view === "assignments"
            ? "/courses/$courseId/assignments"
            : "/courses/$courseId/announcements",
        params,
        search: {},
        replace: true,
      });
  },
  component: CourseOverviewPage,
});

function CourseOverviewPage() {
  const { courseId } = Route.useParams();
  const dashboard = useCanvasStore((state) => state.dashboard);
  const detail = useCourseDetail(courseId);

  if (!detail.data || !dashboard) return null;

  const selectedCourse = dashboard.courses.find(
    (course) => course.id === courseId,
  );

  return (
    <CourseOverview
      data={detail.data}
      score={selectedCourse ? getCourseScore(selectedCourse) : null}
    />
  );
}
