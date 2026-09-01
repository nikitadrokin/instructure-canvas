import { Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Home, LogOut } from "lucide-react";
import type { DashboardData } from "@/components/dashboard/shared";
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
	activePage: "overview" | "courses";
	selectedCourseId?: string;
	onDisconnect: () => void;
}) {
	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader>
				<div className="flex items-center gap-2 px-1 py-1.5">
					<span
						aria-hidden="true"
						className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
					>
						<GraduationCap className="size-4.5" />
					</span>
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
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>Your courses</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{data.courses.map((course) => {
								const label =
									(course.nickname ?? course.course_code) ||
									course.name ||
									"Course";
								return (
									<SidebarMenuItem key={course.id}>
										<SidebarMenuButton
											isActive={
												activePage === "courses" &&
												course.id === selectedCourseId
											}
											tooltip={label}
											render={
												<Link
													to="/courses/$courseId"
													params={{ courseId: course.id }}
												/>
											}
										>
											<BookOpen />
											<span>{label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
					<div className="flex min-w-0 flex-col">
						<span className="font-medium text-xs">Connected at</span>
						<span className="truncate text-foreground text-xs">
							{new URL(data.origin).hostname}
						</span>
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
