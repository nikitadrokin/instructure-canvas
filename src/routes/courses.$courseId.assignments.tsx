import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AssignmentsTable } from "@/components/courses/course-detail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";

export const Route = createFileRoute("/courses/$courseId/assignments")({
  component: CourseAssignmentsPage,
});

function CourseAssignmentsPage() {
  const { courseId } = Route.useParams();
  const detail = useCourseDetail(courseId);
  const [search, setSearch] = useState("");
  if (!detail.data) return null;
  const issue = detail.data.issues.find(
    (entry) => entry.section === "assignments",
  );
  if (issue)
    return (
      <Alert variant="error">
        <AlertTitle>Assignments unavailable</AlertTitle>
        <AlertDescription>{issue.message}</AlertDescription>
        <Button variant="outline" onClick={() => detail.refetch()}>
          Retry
        </Button>
      </Alert>
    );
  const assignments = detail.data.assignments.filter((assignment) =>
    assignment.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Assignments</h2>
        <Input
          className="max-w-xs"
          aria-label="Search assignments"
          placeholder="Search assignments…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {search && !assignments.length ? (
        <p className="text-sm text-muted-foreground">
          No assignments match your search.
        </p>
      ) : (
        <AssignmentsTable assignments={assignments} />
      )}
    </div>
  );
}
