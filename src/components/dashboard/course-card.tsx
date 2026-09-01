import { ExternalLink } from "lucide-react";
import type React from "react";
import {
	type Course,
	getEnrollmentGrade,
	getEnrollmentScore,
	getPrimaryEnrollment,
} from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function CourseCard({
	course,
	origin,
}: {
	course: Course;
	origin: string;
}): React.ReactElement {
	const enrollment = getPrimaryEnrollment(course);
	const score = getEnrollmentScore(enrollment);
	const grade = getEnrollmentGrade(enrollment);
	const role = enrollment?.role?.replace("Enrollment", "") ?? "Member";
	const href = course.html_url ?? `${origin}/courses/${course.id}`;

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
			className="group outline-none transition-colors hover:border-ring/50 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
		>
			<CardHeader>
				<CardDescription className="truncate">
					{course.course_code}
				</CardDescription>
				<CardTitle className="line-clamp-2 text-base leading-snug">
					{course.name ?? course.course_code}
				</CardTitle>
				<CardAction>
					<ExternalLink className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</CardAction>
			</CardHeader>
			<CardContent className="text-muted-foreground text-sm">
				{course.term?.name ?? "Current enrollment"}
			</CardContent>
			<CardFooter className="justify-between gap-2 border-t pt-4">
				<Badge variant="secondary">{role}</Badge>
				<span className="font-semibold text-sm tabular-nums">
					{grade ?? (score === null ? "No grade" : `${Math.round(score)}%`)}
				</span>
			</CardFooter>
		</Card>
	);
}
