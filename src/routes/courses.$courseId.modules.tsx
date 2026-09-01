import { createFileRoute } from "@tanstack/react-router";
import { CourseModules } from "@/components/courses/course-modules";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";

export const Route = createFileRoute("/courses/$courseId/modules")({
	component: CourseModulesPage,
});

function CourseModulesPage() {
	const { courseId } = Route.useParams();
	const dashboard = useCanvasStore((state) => state.dashboard);
	const detail = useCourseDetail(courseId);

	if (!detail.data || !dashboard) return null;

	const issue = detail.data.issues.find(
		(entry) => entry.section === "modules",
	)?.message;

	return (
		<CourseModules
			course={detail.data.course}
			modules={detail.data.modules}
			origin={dashboard.origin}
			issue={issue}
		/>
	);
}
