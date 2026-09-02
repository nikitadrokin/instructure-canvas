import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Download,
	ExternalLink,
	Layers3,
	Lock,
} from "lucide-react";
import {
	type CourseModule,
	type CourseModuleItem,
	isInternalModuleItemType,
	MODULE_ITEM_TYPE_LABELS,
	moduleItemIcon,
	requirementLabel,
} from "@/components/courses/course-modules";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { CanvasModuleItemContent } from "@/integrations/canvas/client";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";
import { useTRPC } from "@/integrations/trpc/react";

export function ModuleItemDetail({
	courseId,
	itemId,
	origin,
}: {
	courseId: string;
	itemId: string;
	origin: string;
}) {
	const trpc = useTRPC();
	const sessionReady = useCanvasStore((state) => state.sessionReady);
	const detail = useCourseDetail(courseId);

	const found = (detail.data?.modules ?? [])
		.flatMap((module) => (module.items ?? []).map((item) => ({ module, item })))
		.find((entry) => entry.item.id === itemId);
	const item = found?.item;
	const internal = item ? isInternalModuleItemType(item.type) : false;

	const content = useQuery(
		trpc.canvas.moduleItemContent.queryOptions(
			{
				courseId,
				type: item?.type ?? "",
				contentId: item?.content_id,
				pageUrl: item?.page_url,
			},
			{
				enabled: Boolean(item && internal) && sessionReady,
				retry: false,
				staleTime: 5 * 60_000,
				gcTime: 60 * 60_000,
			},
		),
	);

	if (!found || !item) {
		return (
			<Card>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Layers3 />
						</EmptyMedia>
						<EmptyTitle>Item not found</EmptyTitle>
						<EmptyDescription>
							This module item is not in the modules Canvas returned for this
							course.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</Card>
		);
	}

	const canvasUrl =
		item.html_url ?? `${origin}/courses/${courseId}/modules/items/${item.id}`;
	const typeLabel = MODULE_ITEM_TYPE_LABELS[item.type ?? ""] ?? "Item";
	const requirement = item.completion_requirement;
	const details = item.content_details;

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Button
					variant="ghost"
					size="sm"
					render={
						<Link
							to="/courses/$courseId/modules"
							params={{ courseId }}
							aria-label="Back to modules"
						/>
					}
				>
					<ArrowLeft />
					Back to modules
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<CardDescription className="flex items-center gap-1.5">
								<span className="[&_svg]:size-3.5">
									{moduleItemIcon(item.type)}
								</span>
								{found.module.name} · {typeLabel}
							</CardDescription>
							<CardTitle className="mt-1 break-words text-2xl">
								{item.title}
							</CardTitle>
						</div>
						<Button
							variant="outline"
							className="shrink-0"
							render={
								// biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
								<a
									href={canvasUrl}
									target="_blank"
									rel="noreferrer"
									aria-label={`Open ${item.title} in Canvas`}
								/>
							}
						>
							<ExternalLink />
							Open in Canvas
						</Button>
					</div>
					<div className="mt-2 flex flex-wrap items-center gap-2">
						{details?.points_possible != null ? (
							<Badge variant="secondary">{details.points_possible} pts</Badge>
						) : null}
						{details?.due_at ? (
							<Badge variant="secondary">
								Due {formatDateTime(details.due_at)}
							</Badge>
						) : null}
						{requirement ? (
							requirement.completed ? (
								<Badge variant="success">
									<CheckCircle2 />
									Completed
								</Badge>
							) : (
								<Badge variant="outline">{requirementLabel(requirement)}</Badge>
							)
						) : null}
						{details?.locked_for_user ? (
							<Badge variant="secondary">
								<Lock />
								Locked
							</Badge>
						) : null}
					</div>
				</CardHeader>
				<CardContent>
					{details?.locked_for_user ? (
						<Alert variant="warning">
							<AlertTitle>This item is locked</AlertTitle>
							<AlertDescription>
								{details.lock_explanation ??
									"Canvas has not unlocked this item for you yet."}
							</AlertDescription>
						</Alert>
					) : !internal ? (
						<ExternalItemBody item={item} canvasUrl={canvasUrl} />
					) : content.isPending ? (
						<div className="flex flex-col gap-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-11/12" />
							<Skeleton className="h-4 w-4/5" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					) : content.error ? (
						<Alert variant="error">
							<AlertTitle>Couldn&rsquo;t load this item</AlertTitle>
							<AlertDescription>{content.error.message}</AlertDescription>
						</Alert>
					) : content.data ? (
						<ItemContent content={content.data} />
					) : null}
				</CardContent>
			</Card>

			<ModuleItemPager
				courseId={courseId}
				module={found.module}
				itemId={item.id}
			/>
		</div>
	);
}

function ExternalItemBody({
	item,
	canvasUrl,
}: {
	item: CourseModuleItem;
	canvasUrl: string;
}) {
	const href = item.external_url ?? canvasUrl;
	return (
		<div className="flex flex-col items-start gap-3">
			<p className="text-muted-foreground text-sm">
				{item.type === "ExternalUrl"
					? "This item links to an external site."
					: "This item type can only be opened in Canvas."}
			</p>
			<Button
				render={
					// biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
					<a
						href={href}
						target="_blank"
						rel="noreferrer"
						aria-label={`Open ${item.title}`}
					/>
				}
			>
				<ExternalLink />
				Open {item.type === "ExternalUrl" ? "link" : "in Canvas"}
			</Button>
		</div>
	);
}

function ItemContent({ content }: { content: CanvasModuleItemContent }) {
	switch (content.kind) {
		case "page":
			return (
				<div className="flex flex-col gap-4">
					{content.page.body ? (
						<CanvasHtml html={content.page.body} />
					) : (
						<p className="text-muted-foreground text-sm">This page is empty.</p>
					)}
					{content.page.updated_at ? (
						<p className="text-muted-foreground text-xs">
							Last updated {formatDateTime(content.page.updated_at)}
						</p>
					) : null}
				</div>
			);
		case "assignment":
			return (
				<div className="flex flex-col gap-4">
					{content.assignment.submission_types?.length ? (
						<p className="text-muted-foreground text-sm">
							Submit via{" "}
							{content.assignment.submission_types
								.map((type) => type.replaceAll("_", " "))
								.join(", ")}
							.
						</p>
					) : null}
					{content.assignment.description ? (
						<CanvasHtml html={content.assignment.description} />
					) : (
						<p className="text-muted-foreground text-sm">
							This assignment has no description.
						</p>
					)}
				</div>
			);
		case "discussion":
			return (
				<div className="flex flex-col gap-4">
					<p className="text-muted-foreground text-sm">
						{content.topic.author?.display_name ?? "Discussion"}
						{content.topic.posted_at
							? ` · ${formatDateTime(content.topic.posted_at)}`
							: ""}
						{content.topic.discussion_subentry_count
							? ` · ${content.topic.discussion_subentry_count} replies`
							: ""}
					</p>
					{content.topic.message ? (
						<CanvasHtml html={content.topic.message} />
					) : (
						<p className="text-muted-foreground text-sm">
							This discussion has no prompt text.
						</p>
					)}
				</div>
			);
		case "quiz":
			return (
				<div className="flex flex-col gap-4">
					<p className="text-muted-foreground text-sm">
						{[
							content.quiz.question_count != null
								? `${content.quiz.question_count} questions`
								: null,
							content.quiz.time_limit != null
								? `${content.quiz.time_limit} minute limit`
								: null,
							content.quiz.allowed_attempts != null
								? content.quiz.allowed_attempts === -1
									? "Unlimited attempts"
									: `${content.quiz.allowed_attempts} attempts`
								: null,
						]
							.filter(Boolean)
							.join(" · ") || "Quiz details unavailable."}
					</p>
					{content.quiz.description ? (
						<CanvasHtml html={content.quiz.description} />
					) : null}
				</div>
			);
		case "file":
			return (
				<div className="flex flex-col items-start gap-3">
					<p className="text-muted-foreground text-sm">
						{[
							content.file.filename ?? content.file.display_name,
							content.file["content-type"],
							content.file.size != null ? formatBytes(content.file.size) : null,
						]
							.filter(Boolean)
							.join(" · ")}
					</p>
					{content.file.url ? (
						<Button
							render={
								// biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
								<a
									href={content.file.url}
									target="_blank"
									rel="noreferrer"
									aria-label={`Download ${content.file.display_name}`}
								/>
							}
						>
							<Download />
							Download
						</Button>
					) : null}
				</div>
			);
	}
}

function ModuleItemPager({
	courseId,
	module,
	itemId,
}: {
	courseId: string;
	module: CourseModule;
	itemId: string;
}) {
	const sequence = (module.items ?? []).filter(
		(entry) => entry.type !== "SubHeader",
	);
	const index = sequence.findIndex((entry) => entry.id === itemId);
	const previous = index > 0 ? sequence[index - 1] : undefined;
	const next =
		index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : undefined;

	if (!previous && !next) return null;

	return (
		<div className="flex items-center justify-between gap-3">
			{previous ? (
				<PagerButton courseId={courseId} item={previous} direction="previous" />
			) : (
				<span />
			)}
			{next ? (
				<PagerButton courseId={courseId} item={next} direction="next" />
			) : (
				<span />
			)}
		</div>
	);
}

function PagerButton({
	courseId,
	item,
	direction,
}: {
	courseId: string;
	item: CourseModuleItem;
	direction: "previous" | "next";
}) {
	const internal =
		isInternalModuleItemType(item.type) &&
		!item.content_details?.locked_for_user;
	const label = (
		<>
			{direction === "previous" ? <ChevronLeft /> : null}
			<span className="max-w-48 truncate">{item.title}</span>
			{direction === "next" ? <ChevronRight /> : null}
			{!internal ? <ExternalLink className="size-3.5" /> : null}
		</>
	);

	if (internal) {
		return (
			<Button
				variant="outline"
				render={
					<Link
						to="/courses/$courseId/modules/items/$itemId"
						params={{ courseId, itemId: item.id }}
						aria-label={`${direction === "previous" ? "Previous" : "Next"}: ${item.title}`}
					/>
				}
			>
				{label}
			</Button>
		);
	}
	const href = item.external_url ?? item.html_url;
	if (!href) return <span />;
	return (
		<Button
			variant="outline"
			render={
				// biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
				<a
					href={href}
					target="_blank"
					rel="noreferrer"
					aria-label={`${direction === "previous" ? "Previous" : "Next"}: ${item.title} (opens in Canvas)`}
				/>
			}
		>
			{label}
		</Button>
	);
}

function CanvasHtml({ html }: { html: string }) {
	return (
		<>
			<Separator className="mb-4" />
			<div
				className="canvas-content"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Canvas sanitizes rich content server-side before the API returns it
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</>
	);
}

function formatBytes(size: number) {
	if (size < 1024) return `${size} B`;
	const units = ["KB", "MB", "GB"];
	let value = size;
	let unit = "B";
	for (const next of units) {
		if (value < 1024) break;
		value /= 1024;
		unit = next;
	}
	return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
}

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}
