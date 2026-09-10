import { createFileRoute } from "@tanstack/react-router";
import { CourseAnnouncements } from "@/components/courses/course-detail";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";

export const Route = createFileRoute("/courses/$courseId/announcements")({
  component: CourseAnnouncementsPage,
});

function CourseAnnouncementsPage() {
  const { courseId } = Route.useParams();
  const detail = useCourseDetail(courseId);
  return detail.data ? <CourseAnnouncements data={detail.data} /> : null;
}
