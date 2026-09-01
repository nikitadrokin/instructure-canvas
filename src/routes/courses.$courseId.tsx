import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
	CourseNav,
	CourseSkeleton,
	DisconnectedState,
} from "@/components/courses/course-detail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";

export const Route = createFileRoute("/courses/$courseId")({
	component: CourseDetailLayout,
});

function CourseDetailLayout() {
	const { courseId } = Route.useParams();
	const dashboard = useCanvasStore((state) => state.dashboard);
	const hasHydrated = useCanvasStore((state) => state.hasHydrated);
	const isRestoring = useCanvasStore((state) => state.isRestoring);

	const detail = useCourseDetail(courseId);

	return (
		<div className="flex flex-col gap-8 md:flex-row md:items-start">
			{detail.data && dashboard ? (
				<CourseNav course={detail.data.course} tabs={detail.data.tabs} />
			) : null}

			<div className="min-w-0 flex-1">
				{!hasHydrated || detail.isPending || isRestoring ? (
					<CourseSkeleton />
				) : null}
				{hasHydrated && !dashboard ? <DisconnectedState /> : null}
				{detail.error && !isRestoring ? (
					<Alert variant="error">
						<AlertTitle>Couldn&rsquo;t load this course</AlertTitle>
						<AlertDescription>{detail.error.message}</AlertDescription>
					</Alert>
				) : null}
				{detail.data && dashboard ? <Outlet /> : null}
			</div>
		</div>
	);
}
