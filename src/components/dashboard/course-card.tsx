import { Link } from "@tanstack/react-router";
import type React from "react";
import {
  type Course,
  getEnrollmentGrade,
  getEnrollmentScore,
  getPrimaryEnrollment,
} from "@/components/dashboard/shared";
import { Card } from "@/components/ui/card";

/** Letter grade when Canvas has one, otherwise the rounded percentage. */
function getGradeLabel(course: Course): string | null {
  const enrollment = getPrimaryEnrollment(course);
  const grade = getEnrollmentGrade(enrollment);
  if (grade) return grade;
  const score = getEnrollmentScore(enrollment);
  return score === null ? null : `${Math.round(score)}%`;
}

/** Enrollment role, only when it differs from the default student view. */
function getUnusualRole(course: Course): string | null {
  const role = getPrimaryEnrollment(course)?.role?.replace("Enrollment", "");
  return role && role !== "Student" ? role : null;
}

export function CourseCard({ course }: { course: Course }): React.ReactElement {
  const gradeLabel = getGradeLabel(course);
  const role = getUnusualRole(course);
  const eyebrow = [course.course_code, role].filter(Boolean).join(" · ");

  return (
    <Card
      render={
        <Link
          to="/courses/$courseId"
          params={{ courseId: course.id }}
          aria-label={course.name ?? course.course_code}
        />
      }
      className="gap-2 p-5 outline-none transition-shadow duration-150 ease-out hover:shadow-raised-hover focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="eyebrow truncate">{eyebrow}</span>
      <span className="line-clamp-2 font-heading font-medium text-lg leading-snug">
        {course.name ?? course.course_code}
      </span>
      <div className="mt-auto flex items-baseline justify-between gap-3 pt-4 text-sm">
        <span className="truncate text-muted-foreground">
          {course.term?.name ?? "Current enrollment"}
        </span>
        <span
          className={
            gradeLabel
              ? "shrink-0 font-medium tabular-nums"
              : "shrink-0 text-muted-foreground"
          }
        >
          {gradeLabel ?? "No grade"}
        </span>
      </div>
    </Card>
  );
}

/** Compact single-line course entry for secondary lists. */
export function CourseRow({ course }: { course: Course }): React.ReactElement {
  const gradeLabel = getGradeLabel(course);

  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className="flex items-baseline justify-between gap-4 px-5 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-sm">
          {course.name ?? course.course_code}
        </span>
        <span className="eyebrow truncate">{course.course_code}</span>
      </div>
      <span className="shrink-0 text-muted-foreground text-sm tabular-nums">
        {gradeLabel ?? "—"}
      </span>
    </Link>
  );
}
