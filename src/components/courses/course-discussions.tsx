import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ExternalLink,
  Lock,
  MessagesSquare,
  Pin,
} from "lucide-react";
import { type ReactElement, useState } from "react";
import { DiscussionView } from "@/components/courses/items/discussion-view";
import { formatDate, formatDateTime } from "@/components/courses/items/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
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
import type { CanvasDiscussionTopic } from "@/integrations/canvas/client";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPC } from "@/integrations/trpc/react";

/** Pinned topics first, otherwise keep Canvas's recent-activity order. */
function sortTopics(topics: CanvasDiscussionTopic[]): CanvasDiscussionTopic[] {
  return [...topics].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

/** Discussion topics for a course. */
export function CourseDiscussions({
  courseId,
}: {
  courseId: string;
}): ReactElement {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const [search, setSearch] = useState("");
  const query = useQuery(
    trpc.canvas.courseDiscussions.queryOptions(
      { courseId },
      { enabled: ready, retry: false, staleTime: 60_000 },
    ),
  );
  const needle = search.trim().toLocaleLowerCase();
  const topics = sortTopics(
    (query.data ?? []).filter(
      (topic) =>
        topic.published !== false &&
        topic.title.toLocaleLowerCase().includes(needle),
    ),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Discussions</h2>
        <Input
          aria-label="Search discussions"
          placeholder="Search discussions…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
      </div>
      {query.isPending ? (
        <div className="grid gap-2">
          <span className="sr-only">Loading discussions</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {query.error ? (
        <Alert variant="error">
          <AlertTitle>Couldn&rsquo;t load discussions</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}
      {query.data && topics.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessagesSquare />
              </EmptyMedia>
              <EmptyTitle>
                {needle ? "No matches" : "No discussions"}
              </EmptyTitle>
              <EmptyDescription>
                {needle
                  ? "No discussions match your search."
                  : "This course has no discussion topics yet."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : null}
      {topics.length ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead className="text-right">Replies</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow key={topic.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {topic.pinned ? (
                        <Pin
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-label="Pinned"
                        />
                      ) : null}
                      <Link
                        to="/courses/$courseId/discussions/$topicId"
                        params={{ courseId, topicId: topic.id }}
                        className="truncate hover:underline"
                      >
                        {topic.title}
                      </Link>
                      {topic.unread_count ? (
                        <Badge variant="info">{topic.unread_count} new</Badge>
                      ) : null}
                      {topic.locked || topic.locked_for_user ? (
                        <Lock
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-label="Locked"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {topic.discussion_subentry_count ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {topic.last_reply_at || topic.posted_at
                      ? formatDate(topic.last_reply_at ?? topic.posted_at ?? "")
                      : "—"}
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

/** One discussion topic with its threaded replies. */
export function CourseDiscussionDetail({
  courseId,
  topicId,
}: {
  courseId: string;
  topicId: string;
}): ReactElement {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const query = useQuery(
    trpc.canvas.moduleItemContent.queryOptions(
      { courseId, type: "Discussion", contentId: topicId },
      {
        enabled: ready,
        retry: false,
        staleTime: 5 * 60_000,
        gcTime: 60 * 60_000,
      },
    ),
  );
  const content = query.data?.kind === "discussion" ? query.data : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              to="/courses/$courseId/discussions"
              params={{ courseId }}
              aria-label="Back to discussions"
            />
          }
        >
          <ArrowLeft />
          Back to discussions
        </Button>
      </div>
      {query.isPending ? (
        <div className="grid gap-2">
          <span className="sr-only">Loading discussion</span>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
      {query.error ? (
        <Alert variant="error">
          <AlertTitle>Couldn&rsquo;t load this discussion</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}
      {content ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
            <div className="min-w-0">
              <h2 className="wrap-break-word text-2xl font-semibold">
                {content.topic.title}
              </h2>
              {content.topic.posted_at ? (
                <CardDescription className="mt-1">
                  Posted {formatDateTime(content.topic.posted_at)}
                </CardDescription>
              ) : null}
            </div>
            {content.topic.html_url ? (
              <Button
                variant="outline"
                render={
                  // biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
                  <a
                    href={content.topic.html_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Reply to ${content.topic.title} in Canvas`}
                  />
                }
              >
                <ExternalLink />
                Reply in Canvas
              </Button>
            ) : null}
          </div>
          <DiscussionView
            topic={content.topic}
            entries={content.entries}
            participants={content.participants}
            courseId={courseId}
          />
        </>
      ) : null}
    </div>
  );
}
