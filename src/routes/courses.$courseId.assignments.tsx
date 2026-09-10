import { createFileRoute } from "@tanstack/react-router";
import { AssignmentsTable } from "@/components/courses/course-detail";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";

export const Route = createFileRoute("/courses/$courseId/assignments")({
  component: CourseAssignmentsPage,
});

function CourseAssignmentsPage() {
  const { courseId } = Route.useParams();
  const detail = useCourseDetail(courseId);
  return detail.data ? (
    <AssignmentsTable assignments={detail.data.assignments} />
  ) : null;
}
