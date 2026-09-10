import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";
import { AssignmentView } from "./items/assignment-view";
import { QuizView } from "./items/quiz-view";

export function CourseResource({
  courseId,
  id,
  kind,
}: {
  courseId: string;
  id: string;
  kind: "assignment" | "quiz";
}) {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const origin = useCanvasStore((state) => state.dashboard?.origin);
  const query = useQuery(
    trpc.canvas.courseResource.queryOptions(
      { courseId, id, kind },
      { enabled: ready, retry: false, staleTime: 60_000 },
    ),
  );
  const data = query.data;
  const title =
    data?.kind === "assignment" ? data.assignment.name : data?.quiz.title;
  const url =
    data?.kind === "assignment"
      ? data.assignment.html_url
      : data?.quiz.html_url;
  return (
    <div className="space-y-4">
      <Link
        to={
          kind === "assignment"
            ? "/courses/$courseId/assignments"
            : "/courses/$courseId/quizzes"
        }
        params={{ courseId }}
        className="text-sm underline"
      >
        Back to {kind === "assignment" ? "assignments" : "quizzes"}
      </Link>
      {query.isPending ? <output>Loading {kind}…</output> : null}
      {query.error ? (
        <Alert variant="error">
          <AlertTitle>Couldn’t load {kind}</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}
      {data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{title}</h2>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
              >
                {kind === "quiz" ? "Take quiz in Canvas" : "Submit in Canvas"}
              </a>
            ) : null}
          </div>
          {data.kind === "assignment" ? (
            <AssignmentView
              assignment={data.assignment}
              origin={origin ?? ""}
              courseId={courseId}
            />
          ) : (
            <QuizView quiz={data.quiz} />
          )}
        </>
      ) : null}
    </div>
  );
}
