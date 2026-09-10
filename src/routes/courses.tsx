import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { partitionCourses } from "@/components/dashboard/shared";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
                <BreadcrumbPage>Course explorer</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex w-full flex-1 flex-col gap-8 px-6 py-8 md:px-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-heading font-semibold text-3xl tracking-tight">
                Course explorer
              </h1>
            </div>
            {options.length ? (
              <Select
                items={options}
                value={
                  options.find((option) => option.value === selectedId) ?? null
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
                      <SelectGroupLabel>Your Courses</SelectGroupLabel>
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

          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
