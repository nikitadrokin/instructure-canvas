import { createFileRoute } from "@tanstack/react-router";
import { CourseSection } from "@/components/courses/course-section";
export const Route = createFileRoute("/courses/$courseId/quizzes")({ component: Page });
function Page() { const { courseId } = Route.useParams(); return <CourseSection courseId={courseId} section="quizzes" />; }
