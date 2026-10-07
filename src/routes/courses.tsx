import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { partitionCourses } from "@/components/dashboard/shared";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCanvasSessionRestore } from "@/integrations/canvas/use-session";
import { useTRPCClient } from "@/integrations/trpc/react";

export const Route = createFileRoute("/courses")({
  component: CoursesLayout,
});

function CoursesLayout() {
  const navigate = useNavigate();
  const client = useTRPCClient();
  const dashboard = useCanvasStore((state) => state.dashboard);
  const params = useParams({ strict: false });
  const selectedId = params.courseId;

  useCanvasSessionRestore();

  const { starred, other } = partitionCourses(dashboard?.courses ?? []);
  const toOption = (course: (typeof starred)[number]) => ({
    label: course.nickname ?? course.name ?? course.course_code,
    value: course.id,
  });
  const starredOptions = starred.map(toOption);
  const otherOptions = other.map(toOption);
  const options = [...starredOptions, ...otherOptions];
  const selectedCourse = dashboard?.courses.find(
    (course) => course.id === selectedId,
  );
  const selectedCourseName = selectedCourse
    ? (selectedCourse.name ?? selectedCourse.course_code)
    : "Courses";
  const selectedCourseUrl = selectedCourse
    ? (selectedCourse.html_url ??
      `${dashboard?.origin}/courses/${selectedCourse.id}`)
    : null;

  async function disconnect() {
    useCanvasStore.getState().forgetSession();
    try {
      await client.canvas.disconnect.mutate();
    } finally {
      await navigate({ to: "/" });
    }
  }

  return (
    <SidebarProvider>
      {dashboard ? (
        <AppSidebar
          data={dashboard}
          activePage="courses"
          selectedCourseId={selectedId}
          onDisconnect={() => void disconnect()}
        />
      ) : null}

      <SidebarInset>
        <header className="flex min-h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ms-1" />
          <Separator orientation="vertical" className="me-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/" />}>
                  Overview
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{selectedCourseName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ms-auto">
            <ModeToggle />
          </div>
        </header>

        <main className="flex w-full flex-1 flex-col gap-8 px-6 py-8 md:px-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              {selectedCourse ? (
                <p className="text-muted-foreground text-sm">
                  {selectedCourse.course_code}
                </p>
              ) : null}
              <h1 className="font-heading font-semibold text-3xl tracking-tight">
                {selectedCourseName}
              </h1>
            </div>
            <div className="flex flex-col gap-2 self-start pt-6 sm:flex-row">
              {selectedCourseUrl ? (
                <Button
                  variant="outline"
                  render={
                    // biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
                    <a
                      href={selectedCourseUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open this course in Canvas"
                    />
                  }
                >
                  <ExternalLink />
                  Open in Canvas
                </Button>
              ) : null}
              {options.length ? (
                <Select
                  items={options}
                  value={
                    options.find((option) => option.value === selectedId) ??
                    null
                  }
                  onValueChange={(option) =>
                    option &&
                    navigate({
                      to: "/courses/$courseId",
                      params: { courseId: option.value },
                    })
                  }
                  itemToStringValue={(option) => option.value}
                >
                  <SelectTrigger className="w-full md:w-72">
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectPopup>
                    {starredOptions.length ? (
                      <SelectGroup>
                        <SelectGroupLabel>Starred Courses</SelectGroupLabel>
                        {starredOptions.map((option) => (
                          <SelectItem key={option.value} value={option}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                    {starredOptions.length && otherOptions.length ? (
                      <SelectSeparator />
                    ) : null}
                    {otherOptions.length ? (
                      <SelectGroup>
                        <SelectGroupLabel>Other Courses</SelectGroupLabel>
                        {otherOptions.map((option) => (
                          <SelectItem key={option.value} value={option}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                  </SelectPopup>
                </Select>
              ) : null}
            </div>
          </div>

          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
