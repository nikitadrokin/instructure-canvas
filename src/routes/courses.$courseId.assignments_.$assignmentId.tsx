import { createFileRoute } from "@tanstack/react-router";
import { CourseResource } from "@/components/courses/course-resource";
export const Route = createFileRoute(
  "/courses/$courseId/assignments_/$assignmentId",
)({ component: Page });
function Page() {
  const { courseId, assignmentId } = Route.useParams();
  return (
    <CourseResource courseId={courseId} id={assignmentId} kind="assignment" />
  );
}
