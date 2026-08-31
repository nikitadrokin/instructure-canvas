import { ExternalLink } from "lucide-react";
import type React from "react";
import {
	type Course,
	getEnrollmentGrade,
	getEnrollmentScore,
	getPrimaryEnrollment,
} from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONES = [
	"bg-chart-1",
	"bg-chart-2",
	"bg-chart-3",
	"bg-chart-4",
	"bg-chart-5",
];

export function CourseCard({
	course,
	index,
	origin,
}: {
	course: Course;
	index: number;
	origin: string;
}): React.ReactElement {
	const enrollment = getPrimaryEnrollment(course);
	const score = getEnrollmentScore(enrollment);
	const grade = getEnrollmentGrade(enrollment);
	const role = enrollment?.role?.replace("Enrollment", "") ?? "Member";
	const href = course.html_url ?? `${origin}/courses/${course.id}`;
	const tone = TONES[index % TONES.length];

	return (
		<Card
			render={
				// biome-ignore lint/a11y/useAnchorContent: link text is provided by Card children at render time
				<a
					href={href}
					target="_blank"
					rel="noreferrer"
					aria-label={course.name ?? course.course_code}
				/>
			}
			className="group flex-row overflow-hidden transition-shadow hover:shadow-md"
		>
			<span aria-hidden="true" className={cn("w-1.5 shrink-0", tone)} />
			<div className="flex min-w-0 flex-1 flex-col p-4">
				<div className="flex items-center justify-between gap-2">
					<span className="truncate font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{course.course_code}
					</span>
					<ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</div>
				<h3 className="mt-3 line-clamp-2 font-semibold text-sm leading-snug">
					{course.name ?? course.course_code}
				</h3>
				<p className="mt-1 truncate text-muted-foreground text-xs">
					{course.term?.name ?? "Current enrollment"}
				</p>
				<div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
					<Badge variant="secondary">{role}</Badge>
					<strong className="font-semibold text-sm tabular-nums">
						{grade ?? (score === null ? "No grade" : `${Math.round(score)}%`)}
					</strong>
				</div>
			</div>
		</Card>
	);
}
