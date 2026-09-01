import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CourseDetail,
	CourseNav,
	CourseSkeleton,
	DisconnectedState,
} from "@/components/courses/course-detail";
import { getCourseScore } from "@/components/dashboard/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";

export const Route = createFileRoute("/courses/$courseId")({
	component: CourseDetailPage,
});

function CourseDetailPage() {
	const { courseId } = Route.useParams();
	const trpc = useTRPC();
	const dashboard = useCanvasStore((state) => state.dashboard);
	const hasHydrated = useCanvasStore((state) => state.hasHydrated);
	const sessionReady = useCanvasStore((state) => state.sessionReady);
	const isRestoring = useCanvasStore((state) => state.isRestoring);

	const detail = useQuery(
		trpc.canvas.courseDetail.queryOptions(
			{ courseId },
			{
				enabled: Boolean(courseId) && sessionReady,
				retry: false,
				staleTime: 5 * 60_000,
				gcTime: 60 * 60_000,
			},
		),
	);

	const selectedCourse = dashboard?.courses.find(
		(course) => course.id === courseId,
	);

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
				{detail.data && dashboard ? (
					<CourseDetail
						data={detail.data}
						origin={dashboard.origin}
						score={selectedCourse ? getCourseScore(selectedCourse) : null}
					/>
				) : null}
			</div>
		</div>
	);
}
