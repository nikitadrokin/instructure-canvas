import { Link } from "@tanstack/react-router";
import {
  Blocks,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ExternalLink,
  FileQuestion,
  FileText,
  Layers3,
  LayoutGrid,
  Link2,
  List,
  Lock,
  MessagesSquare,
  Paperclip,
  StickyNote,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { CourseDetailData } from "@/components/courses/course-detail";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
} from "@/components/ui/meter";

export type CourseModule = CourseDetailData["modules"][number];
export type CourseModuleItem = NonNullable<CourseModule["items"]>[number];

const ITEM_ICONS: Record<string, React.ReactNode> = {
  Assignment: <FileText />,
  Quiz: <FileQuestion />,
  Discussion: <MessagesSquare />,
  Page: <StickyNote />,
  File: <Paperclip />,
  ExternalUrl: <Link2 />,
  ExternalTool: <Blocks />,
};

export const MODULE_ITEM_TYPE_LABELS: Record<string, string> = {
  Assignment: "Assignment",
  Quiz: "Quiz",
  Discussion: "Discussion",
  Page: "Page",
  File: "File",
  ExternalUrl: "External link",
  ExternalTool: "External tool",
};

export function moduleItemIcon(type?: string) {
  return ITEM_ICONS[type ?? ""] ?? <CircleDashed />;
}

/** Item types this app can render itself; everything else opens in Canvas. */
export function isInternalModuleItemType(type?: string) {
  return (
    type === "Page" ||
    type === "Assignment" ||
    type === "Discussion" ||
    type === "Quiz" ||
    type === "File"
  );
}

export function CourseModules({
  course,
  modules,
  origin,
  issue,
  embedded = false,
}: {
  course: CourseDetailData["course"];
  modules: CourseModule[];
  origin: string;
  issue?: string;
  embedded?: boolean;
}) {
  const [view, setView] = useState<"list" | "cards">("list");
  useEffect(() => {
    try {
      if (localStorage.getItem("canvas-modules-view") === "cards")
        setView("cards");
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
  }, []);
  const changeView = (next: "list" | "cards") => {
    setView(next);
    try {
      localStorage.setItem("canvas-modules-view", next);
    } catch {
      /* Keep the view usable without storage. */
    }
  };
  const trackedItems = modules
    .flatMap((module) => module.items ?? [])
    .filter((item) => item.completion_requirement);
  const completedItems = trackedItems.filter(
    (item) => item.completion_requirement?.completed,
  ).length;
  const moduleNames = new Map(
    modules.map((module) => [module.id, module.name]),
  );

  return (
    <>
      {!embedded ? (
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardDescription>
              {course.name ?? course.course_code}
            </CardDescription>
            <CardTitle className="mt-1 text-2xl">Modules</CardTitle>
          </div>
          <Button
            variant="outline"
            render={
              // biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
              <a
                href={`${origin}/courses/${course.id}/modules`}
                target="_blank"
                rel="noreferrer"
                aria-label="Open modules in Canvas"
              />
            }
          >
            <ExternalLink />
            Open in Canvas
          </Button>
        </div>
      ) : null}

      {trackedItems.length ? (
        <div className="mb-6 border-b pb-6">
          <Meter value={(completedItems / trackedItems.length) * 100}>
            <div className="flex justify-between">
              <MeterLabel>Requirements completed</MeterLabel>
              <span className="text-sm tabular-nums">
                {completedItems} of {trackedItems.length}
              </span>
            </div>
            <MeterTrack>
              <MeterIndicator />
            </MeterTrack>
          </Meter>
        </div>
      ) : (
        <div className="mb-6 border-b" />
      )}

      {issue ? (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>Modules may be incomplete</AlertTitle>
          <AlertDescription>{issue}</AlertDescription>
        </Alert>
      ) : null}

      {modules.length ? (
        <>
          <div className="mb-4 flex justify-end">
            <fieldset
              aria-label="Module layout"
              className="flex gap-0.5 rounded-lg bg-muted p-0.5"
            >
              <Button
                size="icon-sm"
                variant={view === "list" ? "secondary" : "ghost"}
                aria-label="List view"
                title="List view"
                aria-pressed={view === "list"}
                onClick={() => changeView("list")}
              >
                <List />
              </Button>
              <Button
                size="icon-sm"
                variant={view === "cards" ? "secondary" : "ghost"}
                aria-label="Cards view"
                title="Cards view"
                aria-pressed={view === "cards"}
                onClick={() => changeView("cards")}
              >
                <LayoutGrid />
              </Button>
            </fieldset>
          </div>
          <div
            className={
              view === "cards"
                ? "grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-start gap-4"
                : "flex flex-col gap-4"
            }
          >
            {modules.map((module) => (
              <ModuleCard
                key={module.id}
                courseId={course.id}
                module={module}
                moduleNames={moduleNames}
                compact={view === "cards"}
              />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Layers3 />
              </EmptyMedia>
              <EmptyTitle>No modules</EmptyTitle>
              <EmptyDescription>
                Canvas did not return any published modules for this course.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      )}
    </>
  );
}

function ModuleCard({
  courseId,
  module,
  moduleNames,
  compact = false,
}: {
  courseId: string;
  module: CourseModule;
  moduleNames: Map<string, string>;
  compact?: boolean;
}) {
  const items = module.items ?? [];
  const tracked = items.filter((item) => item.completion_requirement);
  const completed = tracked.filter(
    (item) => item.completion_requirement?.completed,
  ).length;
  const progress = tracked.length ? (completed / tracked.length) * 100 : null;
  const prerequisites = (module.prerequisite_module_ids ?? [])
    .map((id) => moduleNames.get(id))
    .filter((name): name is string => Boolean(name));

  const meta = [
    `${items.length || module.items_count || 0} items`,
    tracked.length ? `${completed} of ${tracked.length} done` : null,
    module.state === "locked" && module.unlock_at
      ? `Unlocks ${formatDate(module.unlock_at)}`
      : null,
    prerequisites.length ? `Requires ${prerequisites.join(", ")}` : null,
    module.require_sequential_progress ? "Sequential progress" : null,
  ].filter(Boolean);

  return (
    <Card className="overflow-hidden">
      <Accordion defaultValue={[module.id]}>
        <AccordionItem value={module.id} className="border-b-0">
          <AccordionTrigger className="items-center gap-4 px-5 py-4 hover:bg-accent/50">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="min-w-0 break-words font-heading font-semibold text-[0.95rem] text-foreground">
                  {module.name}
                </span>
                <ModuleStateBadge module={module} />
              </div>
              <span className="font-normal text-muted-foreground text-xs">
                {meta.join(" · ")}
              </span>
              {progress !== null ? (
                <div
                  className="mt-1 h-1 w-full max-w-56 overflow-hidden rounded-full bg-muted"
                  aria-hidden
                >
                  <div
                    className="h-full rounded-full bg-success transition-[width] duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : null}
            </div>
          </AccordionTrigger>
          <AccordionPanel className="px-2.5 pt-0 pb-2.5">
            {items.length ? (
              <ul className="flex flex-col">
                {items.map((item) => (
                  <ModuleItemRow
                    key={item.id}
                    courseId={courseId}
                    item={item}
                    compact={compact}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-2.5 py-2 text-muted-foreground text-sm">
                Canvas did not return the items in this module.
              </p>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

function ModuleStateBadge({ module }: { module: CourseModule }) {
  if (module.published === false)
    return <Badge variant="warning">Unpublished</Badge>;
  switch (module.state) {
    case "completed":
      return (
        <Badge variant="success">
          <CheckCircle2 />
          Completed
        </Badge>
      );
    case "started":
      return <Badge variant="info">In progress</Badge>;
    case "locked":
      return (
        <Badge variant="secondary">
          <Lock />
          Locked
        </Badge>
      );
    default:
      return null;
  }
}

function ModuleItemRow({
  courseId,
  item,
  compact = false,
}: {
  courseId: string;
  item: CourseModuleItem;
  compact?: boolean;
}) {
  const indent = Math.max(item.indent ?? 0, 0);

  if (item.type === "SubHeader") {
    return (
      <li
        className="px-2.5 pt-4 pb-1.5 first:pt-1.5"
        style={{ paddingInlineStart: `${0.625 + indent}rem` }}
      >
        <span className="font-medium text-[0.7rem] text-muted-foreground uppercase tracking-wider">
          {item.title}
        </span>
      </li>
    );
  }

  const locked = item.content_details?.locked_for_user;
  const details = item.content_details;
  const requirement = item.completion_requirement;
  const internal = isInternalModuleItemType(item.type) && !locked;
  const externalHref = item.external_url ?? item.html_url;
  const meta = [
    details?.points_possible != null ? `${details.points_possible} pts` : null,
    details?.due_at ? `Due ${formatDate(details.due_at)}` : null,
    requirement ? requirementLabel(requirement) : null,
  ].filter(Boolean);

  const icon = (
    <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
      {ITEM_ICONS[item.type ?? ""] ?? <CircleDashed />}
    </span>
  );

  const label = <span className="min-w-0 break-words">{item.title}</span>;

  let title: React.ReactNode;
  if (internal) {
    title = (
      <Link
        to="/courses/$courseId/modules/items/$itemId"
        params={{ courseId, itemId: item.id }}
        className="flex min-w-0 items-center gap-2.5 font-medium text-foreground"
      >
        {icon}
        {label}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    );
  } else if (externalHref && !locked) {
    title = (
      <a
        href={externalHref}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2.5 font-medium text-foreground"
      >
        {icon}
        {label}
        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    );
  } else {
    title = (
      <span
        className={`flex min-w-0 items-center gap-2.5 ${
          locked ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {icon}
        {label}
        {locked ? (
          <Lock
            aria-label="Locked"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        ) : null}
      </span>
    );
  }

  return (
    <li
      className={`group relative flex rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent ${compact ? "flex-col items-stretch gap-1" : "items-center justify-between gap-3"}`}
      style={{ paddingInlineStart: `${0.625 + indent}rem` }}
    >
      {title}
      <span
        className={`flex shrink-0 items-center gap-2.5 text-muted-foreground text-xs ${compact ? "pl-6.5" : ""}`}
      >
        {meta.length ? (
          <span
            className={
              compact ? "tabular-nums" : "hidden tabular-nums sm:inline"
            }
          >
            {meta.join(" · ")}
          </span>
        ) : null}
        {requirement ? (
          requirement.completed ? (
            <CheckCircle2
              aria-label="Requirement completed"
              className="size-4 text-success"
            />
          ) : (
            <CircleDashed
              aria-label="Requirement not completed"
              className="size-4"
            />
          )
        ) : null}
      </span>
    </li>
  );
}

export function requirementLabel(
  requirement: NonNullable<CourseModuleItem["completion_requirement"]>,
) {
  switch (requirement.type) {
    case "must_view":
      return "View to complete";
    case "must_submit":
      return "Submit to complete";
    case "must_contribute":
      return "Contribute to complete";
    case "min_score":
      return `Score at least ${requirement.min_score ?? 0}`;
    case "min_percentage":
      return `Score at least ${requirement.min_score ?? 0}%`;
    case "must_mark_done":
      return "Mark as done";
    default:
      return "Complete";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
