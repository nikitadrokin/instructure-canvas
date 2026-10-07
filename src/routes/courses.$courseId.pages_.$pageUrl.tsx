import { createFileRoute } from "@tanstack/react-router";
import { CoursePageDetail } from "@/components/courses/course-pages";

export const Route = createFileRoute("/courses/$courseId/pages_/$pageUrl")({
  component: CoursePageDetailPage,
});

function CoursePageDetailPage() {
  const { courseId, pageUrl } = Route.useParams();
  return <CoursePageDetail courseId={courseId} pageUrl={pageUrl} />;
}
