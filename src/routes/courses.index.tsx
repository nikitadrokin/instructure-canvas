import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
	CourseSkeleton,
	DisconnectedState,
} from "@/components/courses/course-detail";
import { useCanvasStore } from "@/integrations/canvas/store";

export const Route = createFileRoute("/courses/")({
	component: CoursesIndex,
});

function CoursesIndex() {
	const navigate = useNavigate();
	const dashboard = useCanvasStore((state) => state.dashboard);
	const hasHydrated = useCanvasStore((state) => state.hasHydrated);
	const isRestoring = useCanvasStore((state) => state.isRestoring);
	const firstCourseId = dashboard?.courses[0]?.id;

	useEffect(() => {
		if (firstCourseId) {
			void navigate({
				to: "/courses/$courseId",
				params: { courseId: firstCourseId },
				replace: true,
			});
		}
	}, [firstCourseId, navigate]);

	if (firstCourseId) return null;
	if (!hasHydrated || isRestoring) return <CourseSkeleton />;
	return <DisconnectedState />;
}
