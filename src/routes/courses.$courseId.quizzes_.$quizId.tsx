import { createFileRoute } from "@tanstack/react-router";
import { CourseResource } from "@/components/courses/course-resource";
export const Route = createFileRoute("/courses/$courseId/quizzes_/$quizId")({
  component: Page,
});
function Page() {
  const { courseId, quizId } = Route.useParams();
  return <CourseResource courseId={courseId} id={quizId} kind="quiz" />;
}
