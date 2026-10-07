import { usePageTitle } from "@/hooks/use-page-title";
import { useCanvasStore } from "@/integrations/canvas/store";

/**
 * Sets the tab title to `parts | Course name`, matching the course header.
 * With no parts the title is just the course name.
 */
export function useCoursePageTitle(
  courseId: string,
  ...parts: ReadonlyArray<string | null | undefined>
): void {
  const courseName = useCanvasStore((state) => {
    const course = state.dashboard?.courses.find(
      (entry) => entry.id === courseId,
    );
    return course ? (course.name ?? course.course_code) : undefined;
  });
  usePageTitle(...parts, courseName);
}
