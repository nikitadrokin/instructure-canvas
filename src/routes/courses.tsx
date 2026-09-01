import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import {
	BookOpen,
	CheckCircle2,
	ExternalLink,
	FileText,
	GraduationCap,
	Home,
	Layers3,
	Megaphone,
} from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import { getCourseScore } from "@/components/dashboard/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";
import type { TRPCRouter } from "@/integrations/trpc/router";

const courseSearchSchema = z.object({ courseId: z.string().optional() });

export const Route = createFileRoute("/courses")({
	validateSearch: courseSearchSchema,
	component: CoursesPage,
});

function CoursesPage() {
	const { courseId } = Route.useSearch();
	const navigate = useNavigate({ from: "/courses" });
	const trpc = useTRPC();
	const dashboard = useCanvasStore((state) => state.dashboard);
	const hasHydrated = useCanvasStore((state) => state.hasHydrated);

	useEffect(() => {
		if (!hasHydrated) void useCanvasStore.persist.rehydrate();
	}, [hasHydrated]);

	const selectedId = courseId ?? dashboard?.courses[0]?.id;
	const detail = useQuery(
		trpc.canvas.courseDetail.queryOptions(
			{ courseId: selectedId ?? "" },
			{ enabled: Boolean(selectedId), retry: false, staleTime: 60_000 },
		),
	);

	const options = (dashboard?.courses ?? []).map((course) => ({
		label: course.name ?? course.course_code,
		value: course.id,
	}));
	const selectedCourse = dashboard?.courses.find(
		(course) => course.id === selectedId,
	);

	return (
		<SidebarProvider>
			<Sidebar collapsible="icon" variant="inset">
				<SidebarHeader>
					<div className="flex items-center gap-2 px-1 py-1.5">
						<Badge size="lg" className="size-8 justify-center p-0">
							<GraduationCap />
						</Badge>
						<span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
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
										tooltip="Overview"
										render={<Link to="/" />}
									>
										<Home />
										<span>Overview</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton isActive tooltip="Course explorer">
										<BookOpen />
										<span>Course explorer</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					{dashboard?.courses.length ? (
						<SidebarGroup>
							<SidebarGroupLabel>Your courses</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{dashboard.courses.map((course) => (
										<SidebarMenuItem key={course.id}>
											<SidebarMenuButton
												isActive={course.id === selectedId}
												tooltip={course.name ?? course.course_code}
												render={
													<Link
														to="/courses"
														search={{ courseId: course.id }}
													/>
												}
											>
												<BookOpen />
												<span>{course.course_code || course.name}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					) : null}
				</SidebarContent>
				<SidebarRail />
			</Sidebar>

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

				<main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
					<div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-heading font-semibold text-3xl tracking-tight">
								Course explorer
							</h1>
							<p className="mt-1 text-muted-foreground text-sm">
								Assignments, modules, and announcements without leaving your
								dashboard.
							</p>
						</div>
						{options.length ? (
							<Select
								items={options}
								value={
									options.find((option) => option.value === selectedId) ?? null
								}
								onValueChange={(option) =>
									option && navigate({ search: { courseId: option.value } })
								}
								itemToStringValue={(option) => option.value}
							>
								<SelectTrigger className="w-full md:w-72">
									<SelectValue placeholder="Choose a course" />
								</SelectTrigger>
								<SelectPopup>
									{options.map((option) => (
										<SelectItem key={option.value} value={option}>
											{option.label}
										</SelectItem>
									))}
								</SelectPopup>
							</Select>
						) : null}
					</div>

					{!hasHydrated || detail.isPending ? <CourseSkeleton /> : null}
					{hasHydrated && !dashboard ? <DisconnectedState /> : null}
					{detail.error ? (
						<Alert variant="error">
							<AlertTitle>Couldn&rsquo;t load this course</AlertTitle>
							<AlertDescription>{detail.error.message}</AlertDescription>
						</Alert>
					) : null}
					{detail.data && dashboard ? (
						<CourseDetail
							data={detail.data}
							origin={dashboard.origin}
							score={selectedCourse ? getCourseScore(selectedCourse) : null}
						/>
					) : null}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}

type CourseDetailData =
	inferRouterOutputs<TRPCRouter>["canvas"]["courseDetail"];

function CourseDetail({
	data,
	origin,
	score,
}: {
	data: CourseDetailData;
	origin: string;
	score: number | null;
}) {
	const course = data.course;
	const courseUrl = course.html_url ?? `${origin}/courses/${course.id}`;
	const completedItems = data.modules
		.flatMap((module) => module.items ?? [])
		.filter((item) => item.completion_requirement?.completed).length;
	const moduleItems = data.modules.reduce(
		(total, module) =>
			total + (module.items?.length ?? module.items_count ?? 0),
		0,
	);

	return (
		<>
			<Card className="mb-6">
				<CardHeader>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-3">
					<Summary
						icon={<FileText />}
						label="Assignments"
						value={String(data.assignments.length)}
					/>
					<Summary
						icon={<Layers3 />}
						label="Module items"
						value={String(moduleItems)}
					/>
					<Summary
						icon={<Megaphone />}
						label="Announcements"
						value={String(data.announcements.length)}
					/>
				</CardContent>
			</Card>

			<Tabs defaultValue="overview">
				<TabsList
					variant="underline"
					className="mb-4 max-w-full overflow-x-auto"
				>
					<TabsTab value="overview">Overview</TabsTab>
					<TabsTab value="assignments">Assignments</TabsTab>
					<TabsTab value="modules">Modules</TabsTab>
					<TabsTab value="announcements">Announcements</TabsTab>
				</TabsList>
				<TabsPanel value="overview" className="grid gap-4 md:grid-cols-2">
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
				</TabsPanel>
				<TabsPanel value="assignments">
					<AssignmentsTable assignments={data.assignments} />
				</TabsPanel>
				<TabsPanel value="modules" className="grid gap-3">
					{data.modules.length ? (
						data.modules.map((module) => (
							<Card key={module.id}>
								<CardHeader>
									<CardTitle>{module.name}</CardTitle>
									<CardDescription>
										{module.items?.length ?? module.items_count ?? 0} items
									</CardDescription>
								</CardHeader>
								<CardContent className="flex flex-wrap gap-2">
									{(module.items ?? []).map((item) => (
										<Badge
											key={item.id}
											variant={
												item.completion_requirement?.completed
													? "success"
													: "secondary"
											}
										>
											{item.completion_requirement?.completed ? (
												<CheckCircle2 />
											) : null}
											{item.title}
										</Badge>
									))}
								</CardContent>
							</Card>
						))
					) : (
						<TabEmpty
							icon={<Layers3 />}
							title="No modules"
							description="Canvas did not return any published modules."
						/>
					)}
				</TabsPanel>
				<TabsPanel value="announcements" className="grid gap-3">
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
				</TabsPanel>
			</Tabs>
		</>
	);
}

function Summary({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<Card>
			<CardHeader className="flex-row items-center gap-3">
				<Badge variant="secondary" size="lg">
					{icon}
				</Badge>
				<div>
					<CardDescription>{label}</CardDescription>
					<CardTitle className="text-xl tabular-nums">{value}</CardTitle>
				</div>
			</CardHeader>
		</Card>
	);
}

function AssignmentsTable({
	assignments,
}: {
	assignments: CourseDetailData["assignments"];
}) {
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
							<TableCell className="font-medium">{assignment.name}</TableCell>
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

function DisconnectedState() {
	return (
		<TabEmpty
			icon={<GraduationCap />}
			title="Connect to Canvas first"
			description="Return to the overview and connect your Canvas account to browse courses."
		/>
	);
}

function CourseSkeleton() {
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
