import { createFileRoute } from "@tanstack/react-router";
import { CourseDetail } from "@/components/courses/course-detail";
import { getCourseScore } from "@/components/dashboard/shared";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";

export const Route = createFileRoute("/courses/$courseId/")({
	component: CourseOverviewPage,
});

function CourseOverviewPage() {
	const { courseId } = Route.useParams();
	const dashboard = useCanvasStore((state) => state.dashboard);
	const detail = useCourseDetail(courseId);

	if (!detail.data || !dashboard) return null;

	const selectedCourse = dashboard.courses.find(
		(course) => course.id === courseId,
	);

	return (
		<CourseDetail
			data={detail.data}
			origin={dashboard.origin}
			score={selectedCourse ? getCourseScore(selectedCourse) : null}
		/>
	);
}
