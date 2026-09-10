import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Home, LogOut } from "lucide-react";
import { CanvasLogo } from "@/components/canvas-logo/canvas-logo";
import {
  type Course,
  type DashboardData,
  partitionCourses,
} from "@/components/dashboard/shared";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({
  data,
  activePage,
  selectedCourseId,
  onDisconnect,
}: {
  data: DashboardData;
  activePage: "overview" | "courses" | "calendar";
  selectedCourseId?: string;
  onDisconnect: () => void;
}) {
  const { starred, other } = partitionCourses(data.courses);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <CanvasLogo
            decorative
            interactive={false}
            size="sm"
            className="size-8 shrink-0"
          />
          <span className="font-semibold text-sm tracking-tight group-data-[collapsible=icon]:hidden truncate">
            Canvas Local
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activePage === "overview"}
                  tooltip="Overview"
                  render={<Link to="/" />}
                >
                  <Home />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activePage === "calendar"}
                  tooltip="Calendar"
                  render={<Link to="/calendar" />}
                >
                  <CalendarDays />
                  <span>Calendar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {starred.length ? (
          <CourseNavGroup
            label="Starred Courses"
            courses={starred}
            activePage={activePage}
            selectedCourseId={selectedCourseId}
          />
        ) : null}
        {other.length ? (
          <CourseNavGroup
            label="Other Courses"
            courses={other}
            activePage={activePage}
            selectedCourseId={selectedCourseId}
          />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium text-xs">Connected at</span>
            <a
              href={data.origin}
              target="_blank"
              rel="noreferrer noopener"
              className="truncate text-foreground text-xs hover:underline"
            >
              {new URL(data.origin).hostname}
            </a>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onDisconnect} tooltip="Disconnect">
              <LogOut />
              <span>Disconnect</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function CourseNavGroup({
  label,
  courses,
  activePage,
  selectedCourseId,
}: {
  label: string;
  courses: Course[];
  activePage: "overview" | "courses" | "calendar";
  selectedCourseId?: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {courses.map((course) => {
            const courseLabel =
              (course.nickname ?? course.course_code) ||
              course.name ||
              "Course";
            return (
              <SidebarMenuItem key={course.id}>
                <SidebarMenuButton
                  isActive={
                    activePage === "courses" && course.id === selectedCourseId
                  }
                  tooltip={courseLabel}
                  render={
                    <Link
                      to="/courses/$courseId"
                      params={{ courseId: course.id }}
                    />
                  }
                >
                  <BookOpen />
                  <span>{courseLabel}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
