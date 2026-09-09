import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Layers3,
	Lock,
} from "lucide-react";
import type React from "react";
import {
	type CourseModule,
	type CourseModuleItem,
	isInternalModuleItemType,
	MODULE_ITEM_TYPE_LABELS,
	moduleItemIcon,
	requirementLabel,
} from "@/components/courses/course-modules";
import { AssignmentView } from "@/components/courses/items/assignment-view";
import { DiscussionView } from "@/components/courses/items/discussion-view";
import { FileView } from "@/components/courses/items/file-view";
import { PageView } from "@/components/courses/items/page-view";
import { QuizView } from "@/components/courses/items/quiz-view";
import { formatDateTime } from "@/components/courses/items/shared";
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
}): React.ReactElement {
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
					{details?.points_possible != null ||
					details?.due_at ||
					requirement ||
					details?.locked_for_user ? (
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
									<Badge variant="success">Completed</Badge>
								) : (
									<Badge variant="outline">
										{requirementLabel(requirement)}
									</Badge>
								)
							) : null}
							{details?.locked_for_user ? (
								<Badge variant="secondary">
									<Lock />
									Locked
								</Badge>
							) : null}
						</div>
					) : null}
				</CardHeader>
			</Card>

			<ItemBody
				item={item}
				courseId={courseId}
				origin={origin}
				canvasUrl={canvasUrl}
				internal={internal}
				content={content.data}
				isPending={content.isPending}
				error={content.error?.message}
			/>

			<ModuleItemPager
				courseId={courseId}
				module={found.module}
				itemId={item.id}
			/>
		</div>
	);
}

function ItemBody({
	item,
	courseId,
	origin,
	canvasUrl,
	internal,
	content,
	isPending,
	error,
}: {
	item: CourseModuleItem;
	courseId: string;
	origin: string;
	canvasUrl: string;
	internal: boolean;
	content: CanvasModuleItemContent | undefined;
	isPending: boolean;
	error?: string;
}): React.ReactElement {
	if (item.content_details?.locked_for_user) {
		return (
			<Alert variant="warning">
				<AlertTitle>This item is locked</AlertTitle>
				<AlertDescription>
					{item.content_details.lock_explanation ??
						"Canvas has not unlocked this item for you yet."}
				</AlertDescription>
			</Alert>
		);
	}

	if (!internal) {
		return <ExternalItemBody item={item} canvasUrl={canvasUrl} />;
	}

	if (isPending) {
		return (
			<Card>
				<CardContent className="flex flex-col gap-3 pt-6">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-11/12" />
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-4 w-2/3" />
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Alert variant="error">
				<AlertTitle>Couldn&rsquo;t load this item</AlertTitle>
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	if (!content) return <span />;

	switch (content.kind) {
		case "page":
			return <PageView page={content.page} />;
		case "assignment":
			return (
				<AssignmentView
					assignment={content.assignment}
					origin={origin}
					courseId={courseId}
				/>
			);
		case "discussion":
			return (
				<DiscussionView
					topic={content.topic}
					entries={content.entries}
					participants={content.participants}
				/>
			);
		case "quiz":
			return <QuizView quiz={content.quiz} />;
		case "file":
			return <FileView file={content.file} />;
	}
}

function ExternalItemBody({
	item,
	canvasUrl,
}: {
	item: CourseModuleItem;
	canvasUrl: string;
}): React.ReactElement {
	const href = item.external_url ?? canvasUrl;
	return (
		<Card>
			<CardContent className="flex flex-col items-start gap-3 pt-6">
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
			</CardContent>
		</Card>
	);
}

function ModuleItemPager({
	courseId,
	module,
	itemId,
}: {
	courseId: string;
	module: CourseModule;
	itemId: string;
}): React.ReactElement | null {
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
}): React.ReactElement {
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
