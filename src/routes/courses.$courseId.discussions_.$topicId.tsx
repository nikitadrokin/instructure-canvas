import { createFileRoute } from "@tanstack/react-router";
import { CourseDiscussionDetail } from "@/components/courses/course-discussions";

export const Route = createFileRoute(
  "/courses/$courseId/discussions_/$topicId",
)({ component: CourseDiscussionDetailPage });

function CourseDiscussionDetailPage() {
  const { courseId, topicId } = Route.useParams();
  return <CourseDiscussionDetail courseId={courseId} topicId={topicId} />;
}
