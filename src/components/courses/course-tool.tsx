import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCourseDetail } from "@/integrations/canvas/use-course-detail";
import { useTRPC } from "@/integrations/trpc/react";

export function CourseTool({
  courseId,
  tabId,
}: {
  courseId: string;
  tabId: string;
}) {
  const detail = useCourseDetail(courseId);
  const origin = useCanvasStore((state) => state.dashboard?.origin);
  const ready = useCanvasStore((state) => state.sessionReady);
  const tab = detail.data?.tabs.find((entry) => entry.id === tabId);
  const [opened, setOpened] = useState(false);
  const trpc = useTRPC();
  const rawUrl = tab && origin ? new URL(tab.html_url, origin) : null;
  const url = rawUrl?.protocol === "https:" ? rawUrl : null;
  const toolId = url?.pathname.match(/\/external_tools\/(\d+)\/?$/)?.[1];
  const launch = useQuery(
    trpc.canvas.toolLaunch.queryOptions(
      { courseId, toolId: toolId ?? "0" },
      {
        enabled: opened && ready && Boolean(toolId),
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
      },
    ),
  );
  if (!tab)
    return (
      <p className="text-muted-foreground">
        This tool is not available in this course.
      </p>
    );
  const frameUrl = toolId ? launch.data?.url : url?.toString();
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{tab.label}</h2>
        {url ? (
          <a
            href={url.toString()}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
          >
            Open in Canvas
          </a>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        This university tool runs through its provider. You may need to sign in.
        If it cannot display here, use Open in Canvas.
      </p>
      {!opened ? (
        <Button variant="outline" onClick={() => setOpened(true)}>
          Load {tab.label}
        </Button>
      ) : null}
      {opened && toolId && launch.isPending ? (
        <output>Opening tool…</output>
      ) : null}
      {launch.error ? (
        <p role="alert" className="text-sm text-destructive">
          {launch.error.message} Use Open in Canvas to continue.
        </p>
      ) : null}
      {opened && frameUrl ? (
        <iframe
          key={frameUrl}
          src={frameUrl}
          title={tab.label}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          className="h-[70vh] min-h-96 w-full rounded-lg border"
        />
      ) : null}
    </section>
  );
}
