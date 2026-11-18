import { AlertCircle, RefreshCw } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CourseCard, CourseRow } from "@/components/dashboard/course-card";
import { MissingRow } from "@/components/dashboard/missing-row";
import { SectionHeader } from "@/components/dashboard/section-header";
import {
  type Course,
  type DashboardData,
  getCourseScore,
  partitionCourses,
} from "@/components/dashboard/shared";
import { UpcomingRow } from "@/components/dashboard/upcoming-row";
import { ModeToggle } from "@/components/mode-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function Dashboard({
  data,
  error,
  isRefreshing,
  onDisconnect,
  onRefresh,
}: {
  data: DashboardData;
  error?: string;
  isRefreshing: boolean;
  onDisconnect: () => void;
  onRefresh: () => void;
}): React.ReactElement {
  const missing = data.missing ?? [];
  const { starred, other } = useMemo(
    () => partitionCourses(data.courses),
    [data.courses],
  );
  const scores = useMemo(() => {
    const courses = starred.length > 0 ? starred : data.courses;
    return courses
      .map(getCourseScore)
      .filter((score): score is number => score !== null);
  }, [data.courses, starred]);
  const average = scores.length
    ? Math.round(
        scores.reduce((total, score) => total + score, 0) / scores.length,
      )
    : null;
  const today = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const summary = [
    `${data.courses.length} active ${data.courses.length === 1 ? "course" : "courses"}`,
    `${data.upcoming.length} coming up`,
    average === null ? null : `${average}% average`,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <SidebarProvider>
      <AppSidebar
        data={data}
        activePage="overview"
        onDisconnect={onDisconnect}
      />

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ms-1" />
          <Separator orientation="vertical" className="me-1 h-4" />
          <span className="font-medium text-sm">Overview</span>
          <div className="ms-auto flex items-center gap-3">
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              loading={isRefreshing}
            >
              <RefreshCw />
              Refresh
            </Button>
            <ProfileAvatar profile={data.profile} />
          </div>
        </header>

        <div
          aria-busy={isRefreshing}
          className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10"
        >
          <div className="mb-10 flex flex-col">
            <span className="eyebrow mb-2">{today}</span>
            <h1 className="font-heading font-medium text-4xl leading-[1.15] tracking-[-0.025em]">
              {missing.length === 0 ? (
                "Nothing is overdue."
              ) : (
                <>
                  <span className="text-signal-foreground tabular-nums">
                    {missing.length}
                  </span>{" "}
                  {missing.length === 1 ? "assignment is" : "assignments are"}{" "}
                  overdue.
                </>
              )}
            </h1>
            <p className="mt-3 text-muted-foreground text-sm tabular-nums">
              {summary}
            </p>
          </div>

          {error ? (
            <Alert variant="error" className="mb-6">
              <AlertCircle />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="sr-only" aria-live="polite">
            {isRefreshing ? "Refreshing dashboard" : "Dashboard is up to date"}
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
            <div className="flex flex-col gap-10">
              {starred.length ? (
                <CourseSection
                  id="starred-courses"
                  title="Starred"
                  courses={starred}
                  layout="cards"
                />
              ) : null}
              {other.length || !starred.length ? (
                <CourseSection
                  id="courses"
                  title={starred.length ? "Other courses" : "Courses"}
                  courses={other}
                  layout={starred.length ? "list" : "cards"}
                  showEmpty
                />
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-10">
              <section
                id="missing"
                aria-labelledby="missing-heading"
                className="min-w-0"
              >
                <SectionHeader
                  id="missing-heading"
                  title="Missing"
                  aside={missing.length ? String(missing.length) : undefined}
                  asideTone="signal"
                />
                {missing.length ? (
                  <Card className="hairline-rows overflow-hidden">
                    {missing.slice(0, 7).map((item) => (
                      <MissingRow
                        key={item.id}
                        item={item}
                        origin={data.origin}
                      />
                    ))}
                  </Card>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No past-due assignments are waiting on a submission.
                  </p>
                )}
              </section>

              <section
                id="upcoming"
                aria-labelledby="upcoming-heading"
                className="min-w-0"
              >
                <SectionHeader id="upcoming-heading" title="Upcoming" />
                {data.upcoming.length ? (
                  <Card className="hairline-rows overflow-hidden">
                    {data.upcoming.slice(0, 7).map((item) => (
                      <UpcomingRow
                        key={`${item.type}-${item.id}`}
                        item={item}
                        origin={data.origin}
                      />
                    ))}
                  </Card>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nothing is due in the coming days.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function CourseSection({
  id,
  title,
  courses,
  layout,
  showEmpty = false,
}: {
  id: string;
  title: string;
  courses: Course[];
  layout: "cards" | "list";
  showEmpty?: boolean;
}): React.ReactElement {
  return (
    <section id={id} aria-labelledby={`${id}-heading`}>
      <SectionHeader id={`${id}-heading`} title={title} />
      {courses.length ? (
        layout === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <Card className="hairline-rows overflow-hidden">
            {courses.map((course) => (
              <CourseRow key={course.id} course={course} />
            ))}
          </Card>
        )
      ) : showEmpty ? (
        <p className="text-muted-foreground text-sm">
          Canvas did not return any active enrollments for this account.
        </p>
      ) : null}
    </section>
  );
}

function ProfileAvatar({
  profile,
}: {
  profile: DashboardData["profile"];
}): React.ReactElement {
  const initials = profile.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <Avatar className="size-9">
      {profile.avatar_url ? (
        <AvatarImage
          src={profile.avatar_url}
          alt={`${profile.name}'s avatar`}
        />
      ) : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
