import { createFileRoute } from "@tanstack/react-router";
import { CourseModules } from "@/components/courses/course-modules";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";
import { useCoursePageTitle } from "@/integrations/canvas/use-course-title";

export const Route = createFileRoute("/courses/$courseId/modules")({
  component: CourseModulesPage,
});

function CourseModulesPage() {
  const { courseId } = Route.useParams();
  const dashboard = useCanvasStore((state) => state.dashboard);
  const detail = useCourseDetail(courseId);
  useCoursePageTitle(courseId, "Modules");

  if (!detail.data || !dashboard) return null;

  return (
    <CourseModules
      course={detail.data.course}
      modules={detail.data.modules}
      embedded
      origin={dashboard.origin}
    />
  );
}
