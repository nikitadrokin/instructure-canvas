import { createFileRoute } from "@tanstack/react-router";
import { CourseDiscussions } from "@/components/courses/course-discussions";

export const Route = createFileRoute("/courses/$courseId/discussions")({
  component: CourseDiscussionsPage,
});

function CourseDiscussionsPage() {
  const { courseId } = Route.useParams();
  return <CourseDiscussions courseId={courseId} />;
}
