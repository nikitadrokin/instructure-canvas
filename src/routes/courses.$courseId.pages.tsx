import { createFileRoute } from "@tanstack/react-router";
import { CoursePages } from "@/components/courses/course-pages";

export const Route = createFileRoute("/courses/$courseId/pages")({
  component: CoursePagesPage,
});

function CoursePagesPage() {
  const { courseId } = Route.useParams();
  return <CoursePages courseId={courseId} />;
}
