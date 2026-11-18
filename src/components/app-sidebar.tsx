import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Home, ListChecks, LogOut } from "lucide-react";
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
  activePage: "overview" | "courses" | "calendar" | "todo";
  selectedCourseId?: string;
  onDisconnect: () => void;
}) {
  const { starred, other } = partitionCourses(data.courses);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5 -ml-1">
          <CanvasLogo
            decorative
            interactive={false}
            size="sm"
            className="size-8 shrink-0"
          />
          <span className="font-heading font-medium text-base group-data-[collapsible=icon]:hidden truncate">
            Canvas Local
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
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
                  isActive={activePage === "todo"}
                  tooltip="To-do"
                  render={<Link to="/todo" />}
                >
                  <ListChecks />
                  <span>To-do</span>
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
            label="Starred"
            courses={starred}
            activePage={activePage}
            selectedCourseId={selectedCourseId}
          />
        ) : null}
        {other.length ? (
          <CourseNavGroup
            label={starred.length ? "Other courses" : "Courses"}
            courses={other}
            activePage={activePage}
            selectedCourseId={selectedCourseId}
          />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <a
          href={data.origin}
          target="_blank"
          rel="noreferrer noopener"
          className="eyebrow truncate px-2 py-1 normal-case hover:text-foreground group-data-[collapsible=icon]:hidden"
        >
          {new URL(data.origin).hostname}
        </a>
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
  activePage: "overview" | "courses" | "calendar" | "todo";
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
