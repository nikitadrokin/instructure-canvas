import { createFileRoute } from "@tanstack/react-router";
import { ModuleItemDetail } from "@/components/courses/module-item-detail";
import { useCanvasStore } from "@/integrations/canvas/store";

export const Route = createFileRoute(
	"/courses/$courseId/modules_/items/$itemId",
)({
	component: ModuleItemPage,
});

function ModuleItemPage() {
	const { courseId, itemId } = Route.useParams();
	const dashboard = useCanvasStore((state) => state.dashboard);

	if (!dashboard) return null;

	return (
		<ModuleItemDetail
			courseId={courseId}
			itemId={itemId}
			origin={dashboard.origin}
		/>
	);
}
