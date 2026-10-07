import { createFileRoute } from "@tanstack/react-router";
import { CourseFiles } from "@/components/courses/course-files";
import { isCanvasId } from "@/integrations/canvas/file-paths";

export const Route = createFileRoute("/courses/$courseId/files")({
  validateSearch: (search: Record<string, unknown>): { folder?: string } => {
    const folder =
      typeof search.folder === "string" || typeof search.folder === "number"
        ? String(search.folder)
        : undefined;
    return { folder: folder && isCanvasId(folder) ? folder : undefined };
  },
  component: CourseFilesPage,
});

function CourseFilesPage() {
  const { courseId } = Route.useParams();
  const { folder } = Route.useSearch();
  return <CourseFiles courseId={courseId} folderId={folder} />;
}
