import type { inferRouterOutputs } from "@trpc/server";
import type { TRPCRouter } from "#/integrations/trpc/router";

export type DashboardData = NonNullable<
	inferRouterOutputs<TRPCRouter>["canvas"]["dashboard"]
>;
export type Course = DashboardData["courses"][number];
export type UpcomingItem = DashboardData["upcoming"][number];
export type Enrollment = NonNullable<Course["enrollments"]>[number];

export function getPrimaryEnrollment(course: Course): Enrollment | undefined {
	const enrollments = course.enrollments ?? [];
	return (
		enrollments.find(
			(enrollment) =>
				enrollment.type === "student" ||
				enrollment.role === "StudentEnrollment",
		) ?? enrollments[0]
	);
}

export function getEnrollmentScore(
	enrollment: Enrollment | undefined,
): number | null {
	if (!enrollment) return null;
	return (
		enrollment.computed_current_score ??
		enrollment.current_period_computed_current_score ??
		enrollment.current_score ??
		enrollment.grades?.current_score ??
		enrollment.grades?.unposted_current_score ??
		null
	);
}

export function getEnrollmentGrade(
	enrollment: Enrollment | undefined,
): string | null {
	if (!enrollment) return null;
	return (
		enrollment.computed_current_grade ??
		enrollment.current_period_computed_current_grade ??
		enrollment.current_grade ??
		enrollment.grades?.current_grade ??
		enrollment.grades?.unposted_current_grade ??
		null
	);
}

export function getCourseScore(course: Course): number | null {
	return getEnrollmentScore(getPrimaryEnrollment(course));
}

export function formatMonth(date: string): string {
	return new Intl.DateTimeFormat(undefined, { month: "short" }).format(
		new Date(date),
	);
}

export function formatDay(date: string): string {
	return new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(
		new Date(date),
	);
}

export function formatTime(date: string): string {
	return new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(date));
}

export function formatDueLabel(date: string | null | undefined): string {
	if (!date) return "No due date";
	const parsed = new Date(date);
	const day = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	}).format(parsed);
	return `${day} · ${formatTime(date)}`;
}
