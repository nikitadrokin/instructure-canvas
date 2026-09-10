import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";
import type { CourseDetailData } from "@/components/courses/course-detail";
import { Button } from "@/components/ui/button";

/** Course metadata used to build sidebar route params. */
export type CourseSidebarCourse = CourseDetailData["course"];

/** Canvas tabs rendered as sidebar links. */
export type CourseSidebarTabs = CourseDetailData["tabs"];

/** Props for the course explorer sidebar. */
export type CourseSidebarProps = {
  /** Course whose id is used for internal route params. */
  course: CourseSidebarCourse;
  /** Canvas tabs available for this course. */
  tabs: CourseSidebarTabs;
};

export function CourseSidebar({ course, tabs }: CourseSidebarProps) {
  return (
    <nav
      aria-label="Course navigation"
      className="flex shrink-0 flex-col gap-1 md:sticky md:top-8 md:w-52 pt-6"
    >
      {tabs.map((tab) => {
        const internalTo =
          tab.id === "home"
            ? "/courses/$courseId"
            : tab.id === "modules"
              ? "/courses/$courseId/modules"
              : tab.id === "assignments"
                ? "/courses/$courseId/assignments"
                : tab.id === "quizzes"
                  ? "/courses/$courseId/quizzes"
                  : tab.id === "grades"
                    ? "/courses/$courseId/grades"
                    : tab.id === "people"
                      ? "/courses/$courseId/users"
                      : tab.id === "announcements"
                        ? "/courses/$courseId/announcements"
                        : tab.id === "syllabus"
                          ? "/courses/$courseId/syllabus"
                          : null;
        const className =
          "h-auto w-full justify-start whitespace-normal px-3 py-1.5 text-start";
        if (internalTo) {
          return (
            <Button
              key={tab.id}
              variant="link"
              className={cn(className, "data-[status=active]:underline")}
              render={
                <Link
                  to={internalTo}
                  params={{ courseId: course.id }}
                  activeOptions={{ exact: tab.id === "home" }}
                />
              }
            >
              {tab.label}
            </Button>
          );
        }
        return (
          <Button
            key={tab.id}
            variant="link"
            className={className}
            render={
              <Link
                to="/courses/$courseId/tools/$tabId"
                params={{ courseId: course.id, tabId: tab.id }}
              />
            }
          >
            {tab.label}
          </Button>
        );
      })}
    </nav>
  );
}
