import { Link, useRouterState } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import type { CourseDetailData } from "./course-detail";

const views = [
  { id: "home", label: "Overview", to: "/courses/$courseId" },
  {
    id: "assignments",
    label: "Assignments",
    to: "/courses/$courseId/assignments",
  },
  { id: "modules", label: "Modules", to: "/courses/$courseId/modules" },
  {
    id: "announcements",
    label: "Announcements",
    to: "/courses/$courseId/announcements",
  },
] as const;

export function CourseNavigation({
  courseId,
  tabs,
}: {
  courseId: string;
  tabs: CourseDetailData["tabs"];
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Remeasure committed link DOM after route or available-tab changes.
  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;
    // Reading the committed link state also covers Back/Forward and sidebar navigation.
    const update = () => {
      const active = list.querySelector<HTMLAnchorElement>(
        '[data-status="active"]',
      );
      indicator.style.opacity = active ? "1" : "0";
      if (active) {
        indicator.style.transform = `translateX(${active.offsetLeft}px) scaleX(${active.offsetWidth})`;
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    for (const link of list.querySelectorAll("a")) observer.observe(link);
    return () => observer.disconnect();
  }, [pathname, tabs]);

  return (
    <nav aria-label="Course views" className="mb-6 max-w-full overflow-x-auto">
      <div ref={listRef} className="relative flex w-max min-w-0 gap-0.5 pb-0.5">
        {views
          .filter(
            (view) =>
              view.id === "home" || tabs.some((tab) => tab.id === view.id),
          )
          .map((view) => (
            <Link
              key={view.id}
              to={view.to}
              params={{ courseId }}
              search={{}}
              resetScroll={false}
              activeOptions={{
                exact: view.id === "home",
                includeSearch: false,
              }}
              className="shrink-0 rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[status=active]:text-foreground"
            >
              {view.label}
            </Link>
          ))}
        <span
          ref={indicatorRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-primary transition-transform duration-200 ease-in-out motion-reduce:transition-none"
          style={{ opacity: 0 }}
        />
      </div>
    </nav>
  );
}
