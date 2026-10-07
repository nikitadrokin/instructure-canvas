import { createFileRoute } from "@tanstack/react-router";
import { CourseAnnouncements } from "@/components/courses/course-detail";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";
import { useCoursePageTitle } from "@/integrations/canvas/use-course-title";

export const Route = createFileRoute("/courses/$courseId/announcements")({
  component: CourseAnnouncementsPage,
});

function CourseAnnouncementsPage() {
  const { courseId } = Route.useParams();
  const detail = useCourseDetail(courseId);
  useCoursePageTitle(courseId, "Announcements");
  return detail.data ? <CourseAnnouncements data={detail.data} /> : null;
}
