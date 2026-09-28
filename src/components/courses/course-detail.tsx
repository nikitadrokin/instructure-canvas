import { Link, useParams } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  GraduationCap,
  Megaphone,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TRPCRouter } from "@/integrations/trpc/router";

export type CourseDetailData =
  inferRouterOutputs<TRPCRouter>["canvas"]["courseDetail"];
type CoursePlannerItem =
  inferRouterOutputs<TRPCRouter>["canvas"]["coursePlanner"][number];

export function CourseIssues({ data }: { data: CourseDetailData }) {
  return data.issues.length ? (
    <Alert variant="warning" className="mb-6">
      <AlertTitle>Some course sections are unavailable</AlertTitle>
      <AlertDescription>
        {data.issues
          .map((issue) => `${issue.section}: ${issue.message}`)
          .join(" ")}
      </AlertDescription>
    </Alert>
  ) : null;
}

export function CourseOverview({
  data,
  score,
  plannerItems,
  plannerPending,
  plannerUnavailable,
}: {
  data: CourseDetailData;
  score: number | null;
  plannerItems: CoursePlannerItem[];
  plannerPending: boolean;
  plannerUnavailable: boolean;
}) {
  const hasModules = data.tabs.some((tab) => tab.id === "modules");
  const requiredItems = data.modules.flatMap((module) =>
    (module.items ?? []).filter((item) => item.completion_requirement),
  );
  const completedItems = requiredItems.filter(
    (item) => item.completion_requirement?.completed,
  ).length;
  const nextItem = data.modules
    .filter((module) => module.state !== "locked")
    .flatMap((module) => (module.items ?? []).map((item) => ({ module, item })))
    .find(
      ({ item }) =>
        item.type !== "SubHeader" &&
        !item.content_details?.locked_for_user &&
        !item.completion_requirement?.completed,
    );
  const latestAnnouncement = [...data.announcements].sort((a, b) =>
    (b.posted_at ?? "").localeCompare(a.posted_at ?? ""),
  )[0];
  const visiblePlannerItems = plannerItems.slice(0, 4);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Current standing</CardTitle>
          <CardDescription>Your released course score.</CardDescription>
        </CardHeader>
        <CardContent>
          {score === null ? (
            <p className="text-muted-foreground text-sm">
              No score has been released.
            </p>
          ) : (
            <Meter value={score}>
              <div className="flex justify-between">
                <MeterLabel>Course score</MeterLabel>
                <span className="text-sm tabular-nums">
                  {Math.round(score)}%
                </span>
              </div>
              <MeterTrack>
                <MeterIndicator />
              </MeterTrack>
            </Meter>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>This week</CardTitle>
          <CardDescription>
            Assignments and events on your Canvas planner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plannerPending ? (
            <div className="grid gap-2">
              <span className="sr-only">Loading this week’s work</span>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-3/5" />
            </div>
          ) : plannerUnavailable ? (
            <p className="text-muted-foreground text-sm">
              This week’s planner is temporarily unavailable.
            </p>
          ) : visiblePlannerItems.length ? (
            <ul className="grid gap-3">
              {visiblePlannerItems.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="flex gap-3 text-sm"
                >
                  <span className="mt-0.5 text-muted-foreground">
                    {item.completed ? (
                      <Check className="size-4" aria-label="Completed" />
                    ) : (
                      <CalendarDays className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    {item.htmlUrl ? (
                      <a
                        href={item.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <span className="font-medium">{item.title}</span>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {plannerTypeLabel(item.type)}
                      {item.date ? ` · ${formatDateTime(item.date)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nothing is scheduled for this week.
            </p>
          )}
        </CardContent>
      </Card>
      {hasModules ? (
        <Card>
          <CardHeader>
            <CardTitle>Continue learning</CardTitle>
            <CardDescription>
              Your next available item, based on Canvas module progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {nextItem ? (
              <div>
                <p className="text-muted-foreground text-xs">
                  {nextItem.module.name}
                </p>
                <Link
                  to="/courses/$courseId/modules/items/$itemId"
                  params={{
                    courseId: data.course.id,
                    itemId: nextItem.item.id,
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 font-medium hover:underline"
                >
                  {nextItem.item.title}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {requiredItems.length
                  ? "You’ve completed every available requirement."
                  : "No next module requirement is available."}
              </p>
            )}
            {requiredItems.length ? (
              <Meter value={(completedItems / requiredItems.length) * 100}>
                <div className="flex justify-between">
                  <MeterLabel>Required items completed</MeterLabel>
                  <span className="text-sm tabular-nums">
                    {completedItems} of {requiredItems.length}
                  </span>
                </div>
                <MeterTrack>
                  <MeterIndicator />
                </MeterTrack>
              </Meter>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Latest announcement</CardTitle>
          <CardDescription>
            Most recent update from this course.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestAnnouncement ? (
            <div>
              {latestAnnouncement.html_url ? (
                <a
                  href={latestAnnouncement.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {latestAnnouncement.title}
                </a>
              ) : (
                <p className="font-medium">{latestAnnouncement.title}</p>
              )}
              <p className="mt-1 text-muted-foreground text-xs">
                {latestAnnouncement.author?.display_name ??
                  "Course announcement"}
                {latestAnnouncement.posted_at
                  ? ` · ${formatDate(latestAnnouncement.posted_at)}`
                  : ""}
              </p>
              <Link
                to="/courses/$courseId/announcements"
                params={{ courseId: data.course.id }}
                className="mt-4 inline-flex items-center gap-1.5 text-sm hover:underline"
              >
                View all announcements
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              There are no active announcements.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function plannerTypeLabel(type: string) {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function CourseAnnouncements({ data }: { data: CourseDetailData }) {
  return (
    <div className="grid gap-3">
      {data.announcements.length ? (
        data.announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <CardTitle>{announcement.title}</CardTitle>
              <CardDescription>
                {announcement.author?.display_name ?? "Course announcement"}
                {announcement.posted_at
                  ? ` · ${formatDate(announcement.posted_at)}`
                  : ""}
              </CardDescription>
            </CardHeader>
          </Card>
        ))
      ) : (
        <TabEmpty
          icon={<Megaphone />}
          title="No announcements"
          description="There are no active announcements for this course."
        />
      )}
    </div>
  );
}

export function AssignmentsTable({
  assignments,
}: {
  assignments: CourseDetailData["assignments"];
}) {
  const { courseId } = useParams({ from: "/courses/$courseId" });
  if (!assignments.length)
    return (
      <TabEmpty
        icon={<FileText />}
        title="No assignments"
        description="Canvas did not return any assignments for this course."
      />
    );
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assignment</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell className="font-medium">
                <Link
                  to="/courses/$courseId/assignments/$assignmentId"
                  params={{ courseId, assignmentId: assignment.id }}
                  className="hover:underline"
                >
                  {assignment.name}
                </Link>
              </TableCell>
              <TableCell>
                {assignment.due_at
                  ? formatDate(assignment.due_at)
                  : "No due date"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {assignment.points_possible ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function TabEmpty({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">{icon}</EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  );
}

export function DisconnectedState() {
  return (
    <TabEmpty
      icon={<GraduationCap />}
      title="Connect to Canvas first"
      description="Return to the overview and connect your Canvas account to browse courses."
    />
  );
}

export function CourseSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-2/3" />
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
