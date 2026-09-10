import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef } from "react";
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
        <CourseNavigationHighlight />
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
              className="relative shrink-0 rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[status=active]:text-foreground"
            >
              {view.label}
            </Link>
          ))}
        <span
          ref={indicatorRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ opacity: 0 }}
        />
      </div>
    </nav>
  );
}

/** Shared hover treatment adapted from Wood World's NavigationMenuHighlight. */
function CourseNavigationHighlight() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const highlight = ref.current;
    const list = highlight?.parentElement;
    if (!highlight || !list) return;

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let hovered: HTMLAnchorElement | null = null;
    let focused: HTMLAnchorElement | null = null;

    const measure = (link: HTMLAnchorElement) => {
      clearTimeout(hideTimer);
      const appearing = highlight.dataset.visible !== "true";
      if (appearing) highlight.dataset.instant = "true";
      highlight.style.transform = `translate(${link.offsetLeft + 3}px, 3px)`;
      highlight.style.width = `${link.offsetWidth - 6}px`;
      highlight.style.height = `${link.offsetHeight - 6}px`;
      highlight.dataset.visible = "true";
      if (appearing) {
        // Commit the initial position before allowing subsequent moves to slide.
        highlight.getBoundingClientRect();
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          highlight.dataset.instant = "false";
        });
      }
    };
    const update = () => {
      const link = hovered ?? focused;
      if (link && list.contains(link)) measure(link);
      else {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          highlight.dataset.visible = "false";
        }, 80);
      }
    };
    const linkFrom = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLAnchorElement>("a") : null;
    const pointerOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const link = linkFrom(event.target);
      if (link) {
        hovered = link;
        update();
      }
    };
    const pointerLeave = () => {
      hovered = null;
      update();
    };
    const focusIn = (event: FocusEvent) => {
      focused = linkFrom(event.target);
      update();
    };
    const focusOut = (event: FocusEvent) => {
      const next = linkFrom(event.relatedTarget);
      focused = next && list.contains(next) ? next : null;
      update();
    };
    const observer = new ResizeObserver(update);
    for (const link of list.querySelectorAll("a")) observer.observe(link);
    list.addEventListener("pointerover", pointerOver);
    list.addEventListener("pointerleave", pointerLeave);
    list.addEventListener("focusin", focusIn);
    list.addEventListener("focusout", focusOut);
    return () => {
      clearTimeout(hideTimer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      list.removeEventListener("pointerover", pointerOver);
      list.removeEventListener("pointerleave", pointerLeave);
      list.removeEventListener("focusin", focusIn);
      list.removeEventListener("focusout", focusOut);
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 rounded-sm bg-accent opacity-0 transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[instant=true]:transition-opacity data-[instant=true]:duration-150 data-[visible=true]:opacity-100 motion-reduce:transition-none"
    />
  );
}
