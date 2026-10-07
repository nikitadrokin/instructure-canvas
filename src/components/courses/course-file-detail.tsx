import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactElement } from "react";
import { FileView } from "@/components/courses/items/file-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";

/** One course file with an inline preview or download button. */
export function CourseFileDetail({
  courseId,
  fileId,
}: {
  courseId: string;
  fileId: string;
}): ReactElement {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const query = useQuery(
    trpc.canvas.moduleItemContent.queryOptions(
      { courseId, type: "File", contentId: fileId },
      {
        enabled: ready,
        retry: false,
        staleTime: 5 * 60_000,
        gcTime: 60 * 60_000,
      },
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              to="/courses/$courseId/files"
              params={{ courseId }}
              search={{}}
              aria-label="Back to files"
            />
          }
        >
          <ArrowLeft />
          Back to files
        </Button>
      </div>
      {query.isPending ? (
        <div className="grid gap-2">
          <span className="sr-only">Loading file</span>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}
      {query.error ? (
        <Alert variant="error">
          <AlertTitle>Couldn&rsquo;t load this file</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}
      {query.data?.kind === "file" ? (
        <FileView file={query.data.file} courseId={courseId} />
      ) : null}
    </div>
  );
}
