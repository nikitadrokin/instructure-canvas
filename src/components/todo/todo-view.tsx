import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, ListChecks } from "lucide-react";
import { type ReactElement, type ReactNode, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { CanvasTodoItem } from "@/integrations/canvas/client";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";
import {
  segmentedControlItemVariants,
  segmentedControlRootClassName,
} from "@/lib/segmented-control";
import { cn } from "@/lib/utils";
import {
  buildTodoSections,
  TODO_WINDOWS,
  type TodoWindow,
  todoLink,
  todoRange,
  todoTypeLabel,
} from "./shared";

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Cross-course list of due work from the Canvas planner. */
export function TodoView(): ReactElement {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const courses = useCanvasStore((state) => state.dashboard?.courses);
  const [span, setSpan] = useState<TodoWindow>(7);
  const [showCompleted, setShowCompleted] = useState(false);
  const [now] = useState(() => new Date());
  const range = todoRange(now, span);

  const query = useQuery(
    trpc.canvas.todoItems.queryOptions(range, {
      enabled: ready,
      retry: false,
      staleTime: 60_000,
    }),
  );

  const sections = useMemo(
    () =>
      query.data
        ? buildTodoSections(query.data, now, { window: span, showCompleted })
        : undefined,
    [query.data, now, span, showCompleted],
  );
  const courseNames = useMemo(
    () =>
      new Map(
        (courses ?? []).map((course) => [
          course.id,
          course.nickname ?? course.name ?? course.course_code,
        ]),
      ),
    [courses],
  );
  const itemClassName = segmentedControlItemVariants({
    size: "sm",
    state: "checked",
  });
  const isEmpty =
    sections && sections.overdue.length === 0 && sections.groups.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-3xl tracking-tight">
            To-do
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Work due across all of your courses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <RadioGroup
            aria-label="Show work due within"
            value={String(span)}
            onValueChange={(value) => {
              const next = TODO_WINDOWS.find(
                (entry) => String(entry) === value,
              );
              if (next) setSpan(next);
            }}
            className={cn(segmentedControlRootClassName, "flex-row")}
          >
            {TODO_WINDOWS.map((days) => (
              <RadioPrimitive.Root
                key={days}
                className={itemClassName}
                value={String(days)}
              >
                {days} days
              </RadioPrimitive.Root>
            ))}
          </RadioGroup>
          <Label>
            <Switch
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            Show completed
          </Label>
        </div>
      </div>

      {query.isPending ? (
        <div className="grid gap-3">
          <span className="sr-only">Loading your to-do list</span>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {query.error ? (
        <Alert variant="error">
          <AlertTitle>Couldn&rsquo;t load your to-do list</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}

      {isEmpty ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecks />
              </EmptyMedia>
              <EmptyTitle>You&rsquo;re all caught up</EmptyTitle>
              <EmptyDescription>
                Nothing is due in the next {span} days.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : null}

      {sections?.overdue.length ? (
        <TodoSection
          heading="Overdue"
          count={sections.overdue.length}
          tone="warning"
        >
          {sections.overdue.map((item) => (
            <TodoRow
              key={`${item.type}-${item.id}`}
              item={item}
              courseName={courseNames.get(item.courseId ?? "")}
              showDate
            />
          ))}
        </TodoSection>
      ) : null}

      {sections?.groups.map((group) => (
        <TodoSection
          key={group.key}
          heading={group.label}
          count={group.items.length}
        >
          {group.items.map((item) => (
            <TodoRow
              key={`${item.type}-${item.id}`}
              item={item}
              courseName={courseNames.get(item.courseId ?? "")}
            />
          ))}
        </TodoSection>
      ))}
    </div>
  );
}

function TodoSection({
  heading,
  count,
  tone,
  children,
}: {
  heading: string;
  count: number;
  tone?: "warning";
  children: ReactNode;
}): ReactElement {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 font-heading font-semibold text-lg">
        {heading}
        <Badge variant={tone ?? "secondary"} size="sm">
          {count}
        </Badge>
      </h2>
      <Card className="overflow-hidden">
        <ul className="divide-y">{children}</ul>
      </Card>
    </section>
  );
}

function TodoRow({
  item,
  courseName,
  showDate = false,
}: {
  item: CanvasTodoItem;
  courseName?: string;
  showDate?: boolean;
}): ReactElement {
  const link = todoLink(item);
  const when = item.date ? new Date(item.date) : null;
  const meta = [
    courseName ?? item.courseName,
    todoTypeLabel(item.type),
    when ? (showDate ? dateTimeFormat : timeFormat).format(when) : null,
    item.pointsPossible != null ? `${item.pointsPossible} pts` : null,
  ].filter(Boolean);
  const titleClass = cn(
    "truncate font-medium text-sm",
    item.completed && "text-muted-foreground line-through",
  );

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {link.kind === "assignment" ? (
          <Link
            to="/courses/$courseId/assignments/$assignmentId"
            params={{ courseId: link.courseId, assignmentId: link.id }}
            className={cn(titleClass, "hover:underline")}
          >
            {item.title}
          </Link>
        ) : link.kind === "quiz" ? (
          <Link
            to="/courses/$courseId/quizzes/$quizId"
            params={{ courseId: link.courseId, quizId: link.id }}
            className={cn(titleClass, "hover:underline")}
          >
            {item.title}
          </Link>
        ) : link.kind === "discussion" ? (
          <Link
            to="/courses/$courseId/discussions/$topicId"
            params={{ courseId: link.courseId, topicId: link.id }}
            className={cn(titleClass, "hover:underline")}
          >
            {item.title}
          </Link>
        ) : link.kind === "external" ? (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className={cn(
              titleClass,
              "inline-flex items-center gap-1 hover:underline",
            )}
          >
            {item.title}
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
        ) : (
          <span className={titleClass}>{item.title}</span>
        )}
        <span className="truncate text-muted-foreground text-xs">
          {meta.join(" · ")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {item.missing ? (
          <Badge variant="warning" size="sm">
            Missing
          </Badge>
        ) : null}
        {item.late ? (
          <Badge variant="warning" size="sm">
            Late
          </Badge>
        ) : null}
        {item.excused ? (
          <Badge variant="secondary" size="sm">
            Excused
          </Badge>
        ) : null}
        {item.graded ? (
          <Badge variant="success" size="sm">
            Graded
          </Badge>
        ) : item.submitted ? (
          <Badge variant="success" size="sm">
            Submitted
          </Badge>
        ) : null}
      </div>
    </li>
  );
}
