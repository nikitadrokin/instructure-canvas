import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";
import { formatDateTime } from "./items/shared";

export function CourseSection({
  courseId,
  section,
}: {
  courseId: string;
  section: "quizzes" | "people" | "grades";
}) {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const [search, setSearch] = useState("");
  const query = useQuery(
    trpc.canvas.courseSection.queryOptions(
      { courseId, section },
      { enabled: ready, retry: false, staleTime: 60_000 },
    ),
  );
  const data = query.data;
  const matches = (name: string) =>
    name.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold capitalize">{section}</h2>
        <Input
          aria-label={`Search ${section}`}
          placeholder={`Search ${section}…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
      </div>
      {query.isPending ? (
        <output className="text-sm text-muted-foreground">
          Loading {section}…
        </output>
      ) : null}
      {query.error ? (
        <Alert variant="error">
          <AlertTitle>Couldn’t load {section}</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}
      {data?.kind === "people" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items
                .filter((person) => matches(person.name))
                .map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>
                      {[
                        ...new Set(
                          (person.enrollments ?? []).map(
                            (enrollment) => enrollment.role ?? enrollment.type,
                          ),
                        ),
                      ]
                        .filter(Boolean)
                        .join(", ") || "Course member"}
                    </TableCell>
                  </TableRow>
                ))}
              {!data.items.some((person) => matches(person.name)) ? (
                <TableRow>
                  <TableCell colSpan={2}>No people found.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      ) : null}
      {data?.kind === "quizzes" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Time limit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items
                .filter((quiz) => matches(quiz.title))
                .map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell>
                      <Link
                        to="/courses/$courseId/quizzes/$quizId"
                        params={{ courseId, quizId: quiz.id }}
                        className="font-medium hover:underline"
                      >
                        {quiz.title}
                      </Link>
                      {quiz.locked_for_user ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Locked
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {quiz.due_at
                        ? formatDateTime(quiz.due_at)
                        : "No due date"}
                    </TableCell>
                    <TableCell>{quiz.points_possible ?? "—"}</TableCell>
                    <TableCell>
                      {quiz.time_limit
                        ? `${quiz.time_limit} min`
                        : "No time limit"}
                    </TableCell>
                  </TableRow>
                ))}
              {!data.items.some((quiz) => matches(quiz.title)) ? (
                <TableRow>
                  <TableCell colSpan={4}>No quizzes found.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      ) : null}
      {data?.kind === "grades" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Current grade</CardTitle>
            </CardHeader>
            <CardContent>
              {data.enrollments.find(
                (enrollment) => enrollment.type === "StudentEnrollment",
              )?.grades?.current_score != null
                ? `${data.enrollments.find((enrollment) => enrollment.type === "StudentEnrollment")?.grades?.current_score}%`
                : "No course score has been released."}
            </CardContent>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assignments
                  .filter((assignment) => matches(assignment.name))
                  .map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Link
                          to="/courses/$courseId/assignments/$assignmentId"
                          params={{ courseId, assignmentId: assignment.id }}
                          className="font-medium hover:underline"
                        >
                          {assignment.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {assignment.submission?.excused
                          ? "Excused"
                          : `${assignment.submission?.score ?? "—"} / ${assignment.points_possible ?? "—"}`}
                      </TableCell>
                      <TableCell>
                        {assignment.submission?.missing
                          ? "Missing"
                          : assignment.submission?.late
                            ? "Late"
                            : (assignment.submission?.workflow_state?.replaceAll(
                                "_",
                                " ",
                              ) ?? "Not submitted")}
                      </TableCell>
                      <TableCell>
                        {assignment.due_at
                          ? formatDateTime(assignment.due_at)
                          : "No due date"}
                      </TableCell>
                    </TableRow>
                  ))}
                {!data.assignments.some((assignment) =>
                  matches(assignment.name),
                ) ? (
                  <TableRow>
                    <TableCell colSpan={4}>No assignments found.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : null}
    </div>
  );
}
