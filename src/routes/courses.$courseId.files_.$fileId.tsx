import { createFileRoute } from "@tanstack/react-router";
import { CourseFileDetail } from "@/components/courses/course-file-detail";

export const Route = createFileRoute("/courses/$courseId/files_/$fileId")({
  component: CourseFileDetailPage,
});

function CourseFileDetailPage() {
  const { courseId, fileId } = Route.useParams();
  return <CourseFileDetail courseId={courseId} fileId={fileId} />;
}
