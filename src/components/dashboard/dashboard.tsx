import {
	AlertCircle,
	BarChart3,
	BookOpen,
	Calendar,
	CheckCircle2,
	Clock,
	GraduationCap,
	LayoutGrid,
	LogOut,
	RefreshCw,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { CourseCard } from "@/components/dashboard/course-card";
import {
	type DashboardData,
	getCourseScore,
} from "@/components/dashboard/shared";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingRow } from "@/components/dashboard/upcoming-row";
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
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
	{ href: "#overview", icon: LayoutGrid, label: "Overview" },
	{ href: "#courses", icon: BookOpen, label: "Courses" },
	{ href: "#upcoming", icon: Calendar, label: "Upcoming" },
];

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
	const scores = useMemo(
		() =>
			data.courses
				.map(getCourseScore)
				.filter((score): score is number => score !== null),
		[data.courses],
	);
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
			<Sidebar collapsible="icon" variant="inset">
				<SidebarHeader>
					<div className="flex items-center gap-2 px-1 py-1.5">
						<span
							aria-hidden="true"
							className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
						>
							<GraduationCap className="size-4.5" />
						</span>
						<span className="font-semibold text-sm tracking-tight group-data-[collapsible=icon]:hidden">
							Canvas Local
						</span>
					</div>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Navigation</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{NAV_ITEMS.map((item, index) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											isActive={index === 0}
											tooltip={item.label}
											// biome-ignore lint/a11y/useAnchorContent: link label is rendered as SidebarMenuButton children
											render={<a href={item.href} />}
										>
											<item.icon />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter>
					<div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
						<span
							aria-hidden="true"
							className="size-1.5 shrink-0 rounded-full bg-success"
						/>
						<div className="flex min-w-0 flex-col">
							<span className="font-medium text-xs">Connected</span>
							<span className="truncate text-muted-foreground text-xs">
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

			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ms-1" />
					<Separator orientation="vertical" className="me-1 h-4" />
					<span className="font-medium text-sm">Overview</span>
					<div className="ms-auto flex items-center gap-3">
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
						<p className="font-medium text-primary text-xs uppercase tracking-widest">
							{weekday} overview
						</p>
						<h1 className="font-heading font-semibold text-3xl tracking-tight">
							Good to see you, {firstName}.
						</h1>
						<p className="text-muted-foreground text-sm">
							Here&rsquo;s what&rsquo;s happening across your Canvas courses.
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
						className="mb-8 grid gap-4 sm:grid-cols-3"
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
							icon={<BarChart3 />}
							label="Average score"
							value={average === null ? "—" : `${average}%`}
							note={
								scores.length
									? `across ${scores.length} graded courses`
									: "No scores released yet"
							}
						/>
						<StatCard
							icon={<Clock />}
							label="Coming up"
							value={String(data.upcoming.length)}
							note="assignments and events"
						/>
					</section>

					<div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
						<section id="courses" aria-labelledby="courses-heading">
							<div className="mb-4 flex items-end justify-between gap-4">
								<div className="flex flex-col gap-1">
									<p className="font-medium text-primary text-xs uppercase tracking-widest">
										Current term
									</p>
									<h2
										id="courses-heading"
										className="font-heading font-semibold text-xl"
									>
										Your courses
									</h2>
								</div>
								<span className="text-muted-foreground text-xs">
									{data.courses.length} total
								</span>
							</div>
							{data.courses.length ? (
								<div className="grid gap-3 sm:grid-cols-2">
									{data.courses.map((course, index) => (
										<CourseCard
											key={course.id}
											course={course}
											index={index}
											origin={data.origin}
										/>
									))}
								</div>
							) : (
								<Card>
									<Empty>
										<EmptyHeader>
											<EmptyMedia variant="icon">
												<BookOpen />
											</EmptyMedia>
											<EmptyTitle>No active courses</EmptyTitle>
											<EmptyDescription>
												Canvas did not return any available, active enrollments
												for this account.
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
							<div className="mb-4 flex flex-col gap-1">
								<p className="font-medium text-primary text-xs uppercase tracking-widest">
									Next in line
								</p>
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
			</SidebarInset>
		</SidebarProvider>
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
