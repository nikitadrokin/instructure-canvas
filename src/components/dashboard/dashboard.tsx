import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock,
  RefreshCw,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CourseCard } from "@/components/dashboard/course-card";
import { MissingRow } from "@/components/dashboard/missing-row";
import {
  type Course,
  type DashboardData,
  getCourseScore,
  partitionCourses,
} from "@/components/dashboard/shared";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingRow } from "@/components/dashboard/upcoming-row";
import { ModeToggle } from "@/components/mode-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  const firstName =
    data.profile.short_name?.split(" ")[0] ?? data.profile.name.split(" ")[0];
  const weekday = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  }).format(new Date());

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
          <div className="mb-8 flex flex-col gap-1">
            <h1 className="font-heading font-semibold text-3xl tracking-tight">
              Good to see you, {firstName}.
            </h1>
            <p className="text-muted-foreground text-sm">
              Here&rsquo;s what&rsquo;s happening across your Canvas courses on{" "}
              {weekday}.
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

          <section
            aria-label="Dashboard summary"
            className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <StatCard
              icon={<BookOpen />}
              label="Active courses"
              value={String(data.courses.length)}
              note={
                data.courses.length === 1
                  ? "current enrollment"
                  : "current enrollments"
              }
            />
            <StatCard
              icon={<CircleAlert />}
              label="Missing"
              value={String(missing.length)}
              note={
                missing.length === 1
                  ? "assignment still unsubmitted"
                  : "assignments still unsubmitted"
              }
            />
            <StatCard
              icon={<Clock />}
              label="Coming up"
              value={String(data.upcoming.length)}
              note="assignments and events"
            />
            <StatCard
              icon={<BarChart3 />}
              label="Average score"
              value={average === null ? "—" : `${average}%`}
              note={
                scores.length
                  ? `across ${scores.length} graded courses`
                  : "No scores released yet"
              }
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
            <div className="flex flex-col gap-8">
              {starred.length ? (
                <CourseSection
                  id="starred-courses"
                  title="Starred Courses"
                  count={starred.length}
                  courses={starred}
                />
              ) : null}
              {other.length || !starred.length ? (
                <CourseSection
                  id="courses"
                  title="Other Courses"
                  count={other.length}
                  courses={other}
                  empty
                />
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-8">
              <section
                id="missing"
                aria-labelledby="missing-heading"
                className="min-w-0"
              >
                <div className="mb-4">
                  <h2
                    id="missing-heading"
                    className="font-heading font-semibold text-xl"
                  >
                    Missing
                  </h2>
                </div>
                {missing.length ? (
                  <Card className="divide-y overflow-hidden">
                    {missing.slice(0, 7).map((item) => (
                      <MissingRow
                        key={item.id}
                        item={item}
                        origin={data.origin}
                      />
                    ))}
                  </Card>
                ) : (
                  <Card>
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <CheckCircle2 />
                        </EmptyMedia>
                        <EmptyTitle>You&rsquo;re caught up</EmptyTitle>
                        <EmptyDescription>
                          Canvas has no past-due assignments waiting on a
                          submission.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </Card>
                )}
              </section>

              <section
                id="upcoming"
                aria-labelledby="upcoming-heading"
                className="min-w-0"
              >
                <div className="mb-4">
                  <h2
                    id="upcoming-heading"
                    className="font-heading font-semibold text-xl"
                  >
                    Upcoming
                  </h2>
                </div>
                {data.upcoming.length ? (
                  <Card className="divide-y overflow-hidden">
                    {data.upcoming.slice(0, 7).map((item) => (
                      <UpcomingRow
                        key={`${item.type}-${item.id}`}
                        item={item}
                        origin={data.origin}
                      />
                    ))}
                  </Card>
                ) : (
                  <Card>
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <CheckCircle2 />
                        </EmptyMedia>
                        <EmptyTitle>You&rsquo;re all clear</EmptyTitle>
                        <EmptyDescription>
                          Canvas has no upcoming assignments or calendar events
                          for you.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </Card>
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
  count,
  courses,
  empty = false,
}: {
  id: string;
  title: string;
  count: number;
  courses: Course[];
  empty?: boolean;
}): React.ReactElement {
  return (
    <section id={id} aria-labelledby={`${id}-heading`}>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 id={`${id}-heading`} className="font-heading font-semibold text-xl">
          {title}
        </h2>
        <span className="text-muted-foreground text-sm">
          {count} {count === 1 ? "course" : "courses"}
        </span>
      </div>
      {courses.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : empty ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen />
              </EmptyMedia>
              <EmptyTitle>No active courses</EmptyTitle>
              <EmptyDescription>
                Canvas did not return any available, active enrollments for this
                account.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
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
