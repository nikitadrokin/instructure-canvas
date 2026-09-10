import { createFileRoute } from "@tanstack/react-router";
import { CourseTool } from "@/components/courses/course-tool";
export const Route = createFileRoute("/courses/$courseId/tools/$tabId")({
  component: Page,
});
function Page() {
  const { courseId, tabId } = Route.useParams();
  return <CourseTool key={tabId} courseId={courseId} tabId={tabId} />;
}
