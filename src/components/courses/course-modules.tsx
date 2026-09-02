import { Link } from "@tanstack/react-router";
import {
	Blocks,
	CheckCircle2,
	CircleDashed,
	ExternalLink,
	FileQuestion,
	FileText,
	Layers3,
	Link2,
	Lock,
	MessagesSquare,
	Paperclip,
	StickyNote,
} from "lucide-react";
import type { CourseDetailData } from "@/components/courses/course-detail";
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

export type CourseModule = CourseDetailData["modules"][number];
export type CourseModuleItem = NonNullable<CourseModule["items"]>[number];

const ITEM_ICONS: Record<string, React.ReactNode> = {
	Assignment: <FileText />,
	Quiz: <FileQuestion />,
	Discussion: <MessagesSquare />,
	Page: <StickyNote />,
	File: <Paperclip />,
	ExternalUrl: <Link2 />,
	ExternalTool: <Blocks />,
};

export const MODULE_ITEM_TYPE_LABELS: Record<string, string> = {
	Assignment: "Assignment",
	Quiz: "Quiz",
	Discussion: "Discussion",
	Page: "Page",
	File: "File",
	ExternalUrl: "External link",
	ExternalTool: "External tool",
};

export function moduleItemIcon(type?: string) {
	return ITEM_ICONS[type ?? ""] ?? <CircleDashed />;
}

/** Item types this app can render itself; everything else opens in Canvas. */
export function isInternalModuleItemType(type?: string) {
	return (
		type === "Page" ||
		type === "Assignment" ||
		type === "Discussion" ||
		type === "Quiz" ||
		type === "File"
	);
}

export function CourseModules({
	course,
	modules,
	origin,
	issue,
}: {
	course: CourseDetailData["course"];
	modules: CourseModule[];
	origin: string;
	issue?: string;
}) {
	const trackedItems = modules
		.flatMap((module) => module.items ?? [])
		.filter((item) => item.completion_requirement);
	const completedItems = trackedItems.filter(
		(item) => item.completion_requirement?.completed,
	).length;
	const moduleNames = new Map(
		modules.map((module) => [module.id, module.name]),
	);

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<CardDescription>
								{course.name ?? course.course_code}
							</CardDescription>
							<CardTitle className="mt-1 text-2xl">Modules</CardTitle>
						</div>
						<Button
							variant="outline"
							render={
								// biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
								<a
									href={`${origin}/courses/${course.id}/modules`}
									target="_blank"
									rel="noreferrer"
									aria-label="Open modules in Canvas"
								/>
							}
						>
							<ExternalLink />
							Open in Canvas
						</Button>
					</div>
				</CardHeader>
				{trackedItems.length ? (
					<CardContent>
						<Meter value={(completedItems / trackedItems.length) * 100}>
							<div className="flex justify-between">
								<MeterLabel>Requirements completed</MeterLabel>
								<span className="text-sm tabular-nums">
									{completedItems} of {trackedItems.length}
								</span>
							</div>
							<MeterTrack>
								<MeterIndicator />
							</MeterTrack>
						</Meter>
					</CardContent>
				) : null}
			</Card>

			{issue ? (
				<Alert variant="warning">
					<AlertTitle>Modules may be incomplete</AlertTitle>
					<AlertDescription>{issue}</AlertDescription>
				</Alert>
			) : null}

			{modules.length ? (
				<Card className="py-0">
					<Accordion multiple defaultValue={modules.map((module) => module.id)}>
						{modules.map((module) => (
							<ModuleSection
								key={module.id}
								courseId={course.id}
								module={module}
								moduleNames={moduleNames}
							/>
						))}
					</Accordion>
				</Card>
			) : (
				<Card>
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Layers3 />
							</EmptyMedia>
							<EmptyTitle>No modules</EmptyTitle>
							<EmptyDescription>
								Canvas did not return any published modules for this course.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</Card>
			)}
		</div>
	);
}

function ModuleSection({
	courseId,
	module,
	moduleNames,
}: {
	courseId: string;
	module: CourseModule;
	moduleNames: Map<string, string>;
}) {
	const items = module.items ?? [];
	const tracked = items.filter((item) => item.completion_requirement);
	const completed = tracked.filter(
		(item) => item.completion_requirement?.completed,
	).length;
	const prerequisites = (module.prerequisite_module_ids ?? [])
		.map((id) => moduleNames.get(id))
		.filter((name): name is string => Boolean(name));

	const meta = [
		`${items.length || module.items_count || 0} items`,
		tracked.length ? `${completed} of ${tracked.length} complete` : null,
		module.state === "locked" && module.unlock_at
			? `Unlocks ${formatDate(module.unlock_at)}`
			: null,
		prerequisites.length ? `Requires ${prerequisites.join(", ")}` : null,
		module.require_sequential_progress ? "Sequential progress" : null,
	].filter(Boolean);

	return (
		<AccordionItem value={module.id}>
			<AccordionTrigger className="px-4 sm:px-6">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="min-w-0 break-words">{module.name}</span>
						<ModuleStateBadge module={module} />
					</div>
					<span className="font-normal text-muted-foreground text-xs">
						{meta.join(" · ")}
					</span>
				</div>
			</AccordionTrigger>
			<AccordionPanel className="px-4 sm:px-6">
				{items.length ? (
					<ul className="flex flex-col">
						{items.map((item) => (
							<ModuleItemRow key={item.id} courseId={courseId} item={item} />
						))}
					</ul>
				) : (
					<p className="py-1 text-muted-foreground text-sm">
						Canvas did not return the items in this module.
					</p>
				)}
			</AccordionPanel>
		</AccordionItem>
	);
}

function ModuleStateBadge({ module }: { module: CourseModule }) {
	if (module.published === false)
		return <Badge variant="warning">Unpublished</Badge>;
	switch (module.state) {
		case "completed":
			return (
				<Badge variant="success">
					<CheckCircle2 />
					Completed
				</Badge>
			);
		case "started":
			return <Badge variant="info">In progress</Badge>;
		case "locked":
			return (
				<Badge variant="secondary">
					<Lock />
					Locked
				</Badge>
			);
		default:
			return null;
	}
}

function ModuleItemRow({
	courseId,
	item,
}: {
	courseId: string;
	item: CourseModuleItem;
}) {
	const indent = Math.max(item.indent ?? 0, 0);

	if (item.type === "SubHeader") {
		return (
			<li
				className="pt-4 pb-1 first:pt-1"
				style={{ paddingInlineStart: `${indent}rem` }}
			>
				<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					{item.title}
				</span>
			</li>
		);
	}

	const locked = item.content_details?.locked_for_user;
	const details = item.content_details;
	const requirement = item.completion_requirement;
	const internal = isInternalModuleItemType(item.type) && !locked;
	const externalHref = item.external_url ?? item.html_url;
	const meta = [
		details?.points_possible != null ? `${details.points_possible} pts` : null,
		details?.due_at ? `Due ${formatDate(details.due_at)}` : null,
		requirement ? requirementLabel(requirement) : null,
	].filter(Boolean);

	return (
		<li
			className="flex items-center justify-between gap-3 border-b py-2 text-foreground last:border-b-0"
			style={{ paddingInlineStart: `${indent}rem` }}
		>
			<span className="flex min-w-0 items-center gap-2">
				<span className="shrink-0 text-muted-foreground [&_svg]:size-4">
					{ITEM_ICONS[item.type ?? ""] ?? <CircleDashed />}
				</span>
				{internal ? (
					<Link
						to="/courses/$courseId/modules/items/$itemId"
						params={{ courseId, itemId: item.id }}
						className="min-w-0 break-words underline-offset-4 hover:underline"
					>
						{item.title}
					</Link>
				) : externalHref && !locked ? (
					<a
						href={externalHref}
						target="_blank"
						rel="noreferrer"
						className="group inline-flex min-w-0 items-center gap-1.5 underline-offset-4 hover:underline"
					>
						<span className="min-w-0 break-words">{item.title}</span>
						<ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
					</a>
				) : (
					<span
						className={
							locked
								? "min-w-0 break-words text-muted-foreground"
								: "min-w-0 break-words"
						}
					>
						{item.title}
					</span>
				)}
				{locked ? (
					<Lock
						aria-label="Locked"
						className="size-3.5 shrink-0 text-muted-foreground"
					/>
				) : null}
			</span>
			<span className="flex shrink-0 items-center gap-2 text-muted-foreground text-xs">
				{meta.length ? <span>{meta.join(" · ")}</span> : null}
				{requirement ? (
					requirement.completed ? (
						<CheckCircle2
							aria-label="Requirement completed"
							className="size-4 text-success"
						/>
					) : (
						<CircleDashed
							aria-label="Requirement not completed"
							className="size-4"
						/>
					)
				) : null}
			</span>
		</li>
	);
}

export function requirementLabel(
	requirement: NonNullable<CourseModuleItem["completion_requirement"]>,
) {
	switch (requirement.type) {
		case "must_view":
			return "View to complete";
		case "must_submit":
			return "Submit to complete";
		case "must_contribute":
			return "Contribute to complete";
		case "min_score":
			return `Score at least ${requirement.min_score ?? 0}`;
		case "min_percentage":
			return `Score at least ${requirement.min_score ?? 0}%`;
		case "must_mark_done":
			return "Mark as done";
		default:
			return "Complete";
	}
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}
