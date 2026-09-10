import { Link, useParams } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { ExternalLink, FileText, GraduationCap, Megaphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

export function CourseHeader({
  data,
  origin,
}: {
  data: CourseDetailData;
  origin: string;
}) {
  const course = data.course;
  const courseUrl = course.html_url ?? `${origin}/courses/${course.id}`;
  return (
    <>
      {data.issues.length ? (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>Some course sections are unavailable</AlertTitle>
          <AlertDescription>
            {data.issues
              .map((issue) => `${issue.section}: ${issue.message}`)
              .join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="mb-6 flex flex-col gap-4 border-b py-4 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription>{course.course_code}</CardDescription>
          <CardTitle className="mt-1 text-2xl">
            {course.name ?? course.course_code}
          </CardTitle>
        </div>
        <Button
          variant="outline"
          render={
            // biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
            <a
              href={courseUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open this course in Canvas"
            />
          }
        >
          <ExternalLink />
          Open in Canvas
        </Button>
      </div>
    </>
  );
}

export function CourseOverview({
  data,
  score,
}: {
  data: CourseDetailData;
  score: number | null;
}) {
  const hasModules = data.tabs.some((tab) => tab.id === "modules");
  const completedItems = data.modules
    .flatMap((module) => module.items ?? [])
    .filter((item) => item.completion_requirement?.completed).length;
  const moduleItems = data.modules.reduce(
    (total, module) =>
      total + (module.items?.length ?? module.items_count ?? 0),
    0,
  );
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
      {hasModules ? (
        <Card>
          <CardHeader>
            <CardTitle>Module progress</CardTitle>
            <CardDescription>
              Completion requirements reported by Canvas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Meter
              value={moduleItems ? (completedItems / moduleItems) * 100 : 0}
            >
              <div className="flex justify-between">
                <MeterLabel>Completed</MeterLabel>
                <span className="text-sm tabular-nums">
                  {completedItems} of {moduleItems}
                </span>
              </div>
              <MeterTrack>
                <MeterIndicator />
              </MeterTrack>
            </Meter>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
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
