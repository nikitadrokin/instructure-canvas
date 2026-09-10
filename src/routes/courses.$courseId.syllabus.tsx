import { createFileRoute } from "@tanstack/react-router";
import { CanvasHtml } from "@/components/courses/items/shared";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";
export const Route = createFileRoute("/courses/$courseId/syllabus")({
  component: Page,
});
function Page() {
  const { courseId } = Route.useParams();
  const detail = useCourseDetail(courseId);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Syllabus</h2>
      {detail.data?.course.syllabus_body ? (
        <CanvasHtml html={detail.data.course.syllabus_body} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No syllabus content was published here. If your course uses University
          Syllabus, open that tool from the course navigation.
        </p>
      )}
    </section>
  );
}
