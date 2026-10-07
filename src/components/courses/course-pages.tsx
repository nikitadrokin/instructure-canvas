import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, StickyNote } from "lucide-react";
import { type ReactElement, useState } from "react";
import { PageView } from "@/components/courses/items/page-view";
import { formatDate } from "@/components/courses/items/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

/** Wiki pages for a course. */
export function CoursePages({ courseId }: { courseId: string }): ReactElement {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const [search, setSearch] = useState("");
  const query = useQuery(
    trpc.canvas.coursePages.queryOptions(
      { courseId },
      { enabled: ready, retry: false, staleTime: 60_000 },
    ),
  );
  const needle = search.trim().toLocaleLowerCase();
  const pages = (query.data ?? []).filter(
    (page) =>
      page.published !== false &&
      page.title.toLocaleLowerCase().includes(needle),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pages</h2>
        <Input
          aria-label="Search pages"
          placeholder="Search pages…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
      </div>
      {query.isPending ? (
        <div className="grid gap-2">
          <span className="sr-only">Loading pages</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {query.error ? (
        <Alert variant="error">
          <AlertTitle>Couldn&rsquo;t load pages</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}
      {query.data && pages.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <StickyNote />
              </EmptyMedia>
              <EmptyTitle>{needle ? "No matches" : "No pages"}</EmptyTitle>
              <EmptyDescription>
                {needle
                  ? "No pages match your search."
                  : "This course has no published pages."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : null}
      {pages.length ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.page_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {page.url ? (
                        <Link
                          to="/courses/$courseId/pages/$pageUrl"
                          params={{ courseId, pageUrl: page.url }}
                          className="truncate hover:underline"
                        >
                          {page.title}
                        </Link>
                      ) : (
                        <span className="truncate">{page.title}</span>
                      )}
                      {page.front_page ? (
                        <Badge variant="secondary">Front page</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {page.updated_at ? formatDate(page.updated_at) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}

/** One wiki page rendered from its Canvas HTML body. */
export function CoursePageDetail({
  courseId,
  pageUrl,
}: {
  courseId: string;
  pageUrl: string;
}): ReactElement {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const query = useQuery(
    trpc.canvas.moduleItemContent.queryOptions(
      { courseId, type: "Page", pageUrl },
      {
        enabled: ready,
        retry: false,
        staleTime: 5 * 60_000,
        gcTime: 60 * 60_000,
      },
    ),
  );
  const page = query.data?.kind === "page" ? query.data.page : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              to="/courses/$courseId/pages"
              params={{ courseId }}
              aria-label="Back to pages"
            />
          }
        >
          <ArrowLeft />
          Back to pages
        </Button>
      </div>
      {query.isPending ? (
        <div className="grid gap-2">
          <span className="sr-only">Loading page</span>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
      {query.error ? (
        <Alert variant="error">
          <AlertTitle>Couldn&rsquo;t load this page</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}
      {page ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
            <h2 className="min-w-0 wrap-break-word text-2xl font-semibold">
              {page.title}
            </h2>
            {page.html_url ? (
              <Button
                variant="outline"
                render={
                  // biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
                  <a
                    href={page.html_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${page.title} in Canvas`}
                  />
                }
              >
                <ExternalLink />
                Open in Canvas
              </Button>
            ) : null}
          </div>
          {page.locked_for_user ? (
            <Alert variant="warning">
              <AlertTitle>This page is locked</AlertTitle>
              <AlertDescription>
                {page.lock_explanation ??
                  "Canvas has not unlocked this page for you yet."}
              </AlertDescription>
            </Alert>
          ) : (
            <PageView page={page} courseId={courseId} />
          )}
        </>
      ) : null}
    </div>
  );
}
