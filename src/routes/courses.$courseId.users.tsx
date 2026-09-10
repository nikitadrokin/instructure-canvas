import { createFileRoute } from "@tanstack/react-router";
import { CourseSection } from "@/components/courses/course-section";
export const Route = createFileRoute("/courses/$courseId/users")({
  component: Page,
});
function Page() {
  const { courseId } = Route.useParams();
  return <CourseSection courseId={courseId} section="people" />;
}
