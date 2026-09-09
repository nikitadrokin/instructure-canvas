import {
	AlertCircle,
	CalendarClock,
	CheckCircle2,
	CircleDashed,
	ClipboardList,
	Clock,
	FileText,
	MessageSquare,
	Paperclip,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import {
	CanvasHtml,
	formatBytes,
	formatDateTime,
	PersonAvatar,
} from "@/components/courses/items/shared";
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
	Meter,
	MeterIndicator,
	MeterLabel,
	MeterTrack,
} from "@/components/ui/meter";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	CanvasAssignment,
	CanvasSubmission,
} from "@/integrations/canvas/client";

type StatusVariant = "success" | "info" | "warning" | "error" | "secondary";

type SubmissionStatus = {
	label: string;
	variant: StatusVariant;
	icon: React.ReactNode;
};

function getSubmissionStatus(
	assignment: CanvasAssignment,
	submission: CanvasSubmission | null | undefined,
): SubmissionStatus | null {
	// Assignments that accept nothing (e.g. on-paper, external) have no
	// student submission lifecycle to report.
	const types = assignment.submission_types ?? [];
	if (
		types.length === 0 ||
		types.includes("none") ||
		types.includes("not_graded")
	)
		return null;

	if (submission?.excused)
		return { label: "Excused", variant: "info", icon: <ShieldCheck /> };
	if (submission?.missing)
		return { label: "Missing", variant: "error", icon: <AlertCircle /> };
	if (submission?.workflow_state === "graded")
		return { label: "Graded", variant: "success", icon: <CheckCircle2 /> };
	if (submission?.workflow_state === "pending_review")
		return { label: "Pending review", variant: "warning", icon: <Clock /> };
	if (submission?.submitted_at || submission?.workflow_state === "submitted")
		return { label: "Submitted", variant: "success", icon: <CheckCircle2 /> };
	return {
		label: "Not submitted",
		variant: "secondary",
		icon: <CircleDashed />,
	};
}

function formatSubmissionType(type: string): string {
	const labels: Record<string, string> = {
		online_upload: "File upload",
		online_text_entry: "Text entry",
		online_url: "Website URL",
		online_quiz: "Quiz",
		media_recording: "Media recording",
		discussion_topic: "Discussion",
		external_tool: "External tool",
		on_paper: "On paper",
		none: "No submission",
		not_graded: "Not graded",
		student_annotation: "Annotation",
	};
	return labels[type] ?? type.replaceAll("_", " ");
}

export function AssignmentView({
	assignment,
	origin,
	courseId,
}: {
	assignment: CanvasAssignment;
	origin: string;
	courseId: string;
}): React.ReactElement {
	const submission = assignment.submission;
	const status = getSubmissionStatus(assignment, submission);
	const points = assignment.points_possible ?? null;
	const score = submission?.score ?? null;
	const percent =
		score != null && points != null && points > 0
			? Math.round((score / points) * 100)
			: null;
	const comments = (submission?.submission_comments ?? []).filter(
		(comment) => comment.comment,
	);
	const attachments = submission?.attachments ?? [];
	const submissionTypes = (assignment.submission_types ?? []).filter(
		(type) => type !== "none" && type !== "not_graded",
	);

	return (
		<div className="flex flex-col gap-4">
			{status ? (
				<Card>
					<CardHeader>
						<CardDescription className="flex items-center gap-1.5">
							<ClipboardList className="size-3.5" />
							Submission
						</CardDescription>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={status.variant} size="lg">
								{status.icon}
								{status.label}
							</Badge>
							{submission?.late ? (
								<Badge variant="warning">
									<Clock />
									Late
								</Badge>
							) : null}
							{score != null &&
							assignment.grading_type ===
								"points" ? null : submission?.grade ? (
								<Badge variant="outline">Grade {submission.grade}</Badge>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{score != null ? (
							<Meter value={percent ?? 0}>
								<div className="flex items-baseline justify-between">
									<MeterLabel>Score</MeterLabel>
									<span className="text-sm tabular-nums">
										{score}
										{points != null ? ` / ${points}` : ""}
										{percent != null ? ` · ${percent}%` : ""}
									</span>
								</div>
								{percent != null ? (
									<MeterTrack>
										<MeterIndicator />
									</MeterTrack>
								) : null}
							</Meter>
						) : (
							<p className="text-muted-foreground text-sm">
								{points != null
									? `Worth ${points} points. No score released yet.`
									: "No score released yet."}
							</p>
						)}

						<dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
							{submission?.submitted_at ? (
								<Detail
									icon={<CheckCircle2 />}
									label="Submitted"
									value={formatDateTime(submission.submitted_at)}
								/>
							) : null}
							{submission?.graded_at ? (
								<Detail
									icon={<CalendarClock />}
									label="Graded"
									value={formatDateTime(submission.graded_at)}
								/>
							) : null}
							{submission?.attempt ? (
								<Detail
									icon={<CircleDashed />}
									label="Attempt"
									value={
										assignment.allowed_attempts &&
										assignment.allowed_attempts > 0
											? `${submission.attempt} of ${assignment.allowed_attempts}`
											: String(submission.attempt)
									}
								/>
							) : null}
							{submissionTypes.length ? (
								<Detail
									icon={<Paperclip />}
									label="Submission type"
									value={submissionTypes.map(formatSubmissionType).join(", ")}
								/>
							) : null}
						</dl>

						{attachments.length ? (
							<div className="flex flex-col gap-2">
								<Separator />
								<span className="font-medium text-sm">Your files</span>
								<ul className="flex flex-col gap-1.5">
									{attachments.map((file) => (
										<li key={file.id}>
											<a
												href={file.url}
												target="_blank"
												rel="noreferrer"
												className="group flex items-center gap-2 text-sm underline-offset-4 hover:underline"
											>
												<Paperclip className="size-4 shrink-0 text-muted-foreground" />
												<span className="min-w-0 truncate">
													{file.display_name}
												</span>
												{file.size != null ? (
													<span className="shrink-0 text-muted-foreground text-xs">
														{formatBytes(file.size)}
													</span>
												) : null}
											</a>
										</li>
									))}
								</ul>
							</div>
						) : null}

						{submission?.preview_url ? (
							<Button
								variant="outline"
								size="sm"
								className="self-start"
								render={
									// biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
									<a
										href={`${origin}/courses/${courseId}/assignments/${assignment.id}/submissions/me`}
										target="_blank"
										rel="noreferrer"
										aria-label="View submission in Canvas"
									/>
								}
							>
								<FileText />
								View submission
							</Button>
						) : null}
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Details</CardTitle>
				</CardHeader>
				<CardContent>
					{assignment.description ? (
						<CanvasHtml html={assignment.description} />
					) : (
						<p className="text-muted-foreground text-sm">
							This assignment has no description.
						</p>
					)}
				</CardContent>
			</Card>

			{assignment.rubric?.length ? (
				<RubricCard assignment={assignment} submission={submission} />
			) : null}

			{comments.length ? (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<MessageSquare className="size-4" />
							Feedback
						</CardTitle>
						<CardDescription>
							{comments.length} comment{comments.length === 1 ? "" : "s"} from
							your instructor.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="flex flex-col gap-4">
							{comments.map((comment) => (
								<li key={comment.id} className="flex gap-3">
									<PersonAvatar
										name={comment.author_name ?? comment.author?.display_name}
										src={comment.author?.avatar_image_url}
									/>
									<div className="flex min-w-0 flex-col gap-1">
										<div className="flex flex-wrap items-baseline gap-x-2">
											<span className="font-medium text-sm">
												{comment.author_name ??
													comment.author?.display_name ??
													"Instructor"}
											</span>
											{comment.created_at ? (
												<span className="text-muted-foreground text-xs">
													{formatDateTime(comment.created_at)}
												</span>
											) : null}
										</div>
										<p className="whitespace-pre-wrap text-sm">
											{comment.comment}
										</p>
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}

			{assignment.locked_for_user && assignment.lock_explanation ? (
				<Alert variant="warning">
					<AlertTitle>Some content is locked</AlertTitle>
					<AlertDescription>{assignment.lock_explanation}</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}

function Detail({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}): React.ReactElement {
	return (
		<div className="flex items-start gap-2">
			<span className="mt-0.5 text-muted-foreground [&_svg]:size-4">
				{icon}
			</span>
			<div className="flex min-w-0 flex-col">
				<dt className="text-muted-foreground text-xs">{label}</dt>
				<dd className="font-medium">{value}</dd>
			</div>
		</div>
	);
}

function RubricCard({
	assignment,
	submission,
}: {
	assignment: CanvasAssignment;
	submission: CanvasSubmission | null | undefined;
}): React.ReactElement {
	const assessment = submission?.rubric_assessment ?? null;
	const scored = Boolean(assessment);
	const criteria = assignment.rubric ?? [];
	const totalPossible = criteria.reduce(
		(sum, criterion) =>
			sum + (criterion.ignore_for_scoring ? 0 : (criterion.points ?? 0)),
		0,
	);
	const totalAwarded = scored
		? criteria.reduce(
				(sum, criterion) => sum + (assessment?.[criterion.id]?.points ?? 0),
				0,
			)
		: null;

	return (
		<Card className="overflow-hidden py-0">
			<CardHeader className="p-6 pb-0">
				<CardTitle className="text-base">Rubric</CardTitle>
				<CardDescription>
					{scored
						? `Scored ${totalAwarded} of ${totalPossible} points.`
						: `${totalPossible} points across ${criteria.length} criteria.`}
				</CardDescription>
			</CardHeader>
			<CardContent className="p-6 pt-4">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Criterion</TableHead>
							<TableHead>Rating</TableHead>
							<TableHead className="text-right">Score</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{criteria.map((criterion) => {
							const result = assessment?.[criterion.id];
							const rating = criterion.ratings?.find(
								(entry) => entry.id === result?.rating_id,
							);
							return (
								<TableRow key={criterion.id}>
									<TableCell className="max-w-72 whitespace-normal align-top font-medium">
										{criterion.description ?? "Criterion"}
										{criterion.long_description ? (
											<span className="mt-0.5 block font-normal text-muted-foreground text-xs">
												{criterion.long_description}
											</span>
										) : null}
									</TableCell>
									<TableCell className="max-w-64 whitespace-normal align-top text-muted-foreground">
										{rating?.description ?? (scored ? "—" : "Not yet scored")}
										{result?.comments ? (
											<span className="mt-0.5 block text-foreground text-xs italic">
												{result.comments}
											</span>
										) : null}
									</TableCell>
									<TableCell className="align-top text-right tabular-nums">
										{scored ? (result?.points ?? 0) : "—"}
										<span className="text-muted-foreground">
											{" / "}
											{criterion.points ?? 0}
										</span>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
