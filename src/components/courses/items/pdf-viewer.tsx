import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  TextLayer as PDFTextLayer,
  RenderTask,
} from "pdfjs-dist";
import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/ui/toolbar";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvasStore } from "@/integrations/canvas/store";
import { cn } from "@/lib/utils";

const MIN_SCALE = 0.5;
const MAX_FIT_SCALE = 3;
const MAX_SCALE = 4;
const SCALE_STEP = 0.15;

function pageNumbers(count: number) {
  const pages: number[] = [];
  for (let page = 1; page <= count; page += 1) pages.push(page);
  return pages;
}

export function PdfViewer({
  src,
  fileName,
  downloadHref,
}: {
  src: string;
  fileName: string;
  downloadHref?: string;
}): React.ReactElement {
  const labelId = useId();
  const viewerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "custom">("fit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const userZoomed = useRef(false);
  const measuredWidth = useRef(0);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current);
    };

    setFullscreenEnabled(document.fullscreenEnabled);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;

    async function load() {
      setLoading(true);
      setError(null);
      setPdf(null);
      setPageCount(0);
      setPage(1);
      setZoomMode("fit");
      userZoomed.current = false;

      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const { canvasUrl, token } = useCanvasStore.getState();
        const httpHeaders =
          canvasUrl && token
            ? {
                Authorization: `Bearer ${token}`,
                "X-Canvas-Url": canvasUrl,
              }
            : undefined;
        task = pdfjs.getDocument({
          url: src,
          httpHeaders,
          withCredentials: true,
        });
        const documentProxy = await task.promise;
        if (cancelled) {
          await task.destroy();
          return;
        }
        setPdf(documentProxy);
        setPageCount(documentProxy.numPages);
        setLoading(false);
      } catch (caught) {
        if (cancelled) return;
        const name =
          caught && typeof caught === "object" && "name" in caught
            ? String(caught.name)
            : "";
        setError(
          name === "PasswordException"
            ? "This PDF is password protected. Download it to open it."
            : "This PDF could not be displayed. Try downloading it instead.",
        );
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [src]);

  const applyFitWidth = useCallback(
    async (observedWidth?: number) => {
      if (!pdf || !containerRef.current) return;
      const first = await pdf.getPage(1);
      const width = (observedWidth ?? containerRef.current.clientWidth) - 32;
      if (width <= 0) return;
      const next = Math.min(
        MAX_FIT_SCALE,
        Math.max(MIN_SCALE, width / first.getViewport({ scale: 1 }).width),
      );
      if (!userZoomed.current) {
        setScale(next);
        setZoomMode("fit");
      }
    },
    [pdf],
  );

  useEffect(() => {
    void applyFitWidth();
  }, [applyFitWidth]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      const width = node.clientWidth;
      if (Math.abs(width - measuredWidth.current) < 0.5) return;
      measuredWidth.current = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        void applyFitWidth(width);
      });
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [applyFitWidth]);

  const zoomBy = (delta: number) => {
    userZoomed.current = true;
    setZoomMode("custom");
    setScale((current) =>
      Math.min(MAX_SCALE, Math.max(MIN_SCALE, current + delta)),
    );
  };

  const fitToWidth = () => {
    userZoomed.current = false;
    setZoomMode("fit");
    void applyFitWidth();
  };

  const goTo = (next: number) => {
    if (next < 1 || next > pageCount) return;
    setPage(next);
    const target = pagesRef.current?.querySelector(`[data-page="${next}"]`);
    target?.scrollIntoView({ block: "start" });
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === viewerRef.current) {
      await document.exitFullscreen();
      return;
    }
    await viewerRef.current?.requestFullscreen();
  };

  return (
    <div
      ref={viewerRef}
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden contain-[inline-size]",
        isFullscreen && "h-screen bg-background p-3",
      )}
    >
      <Toolbar
        aria-labelledby={labelId}
        className="w-full flex-wrap items-center rounded-none border-0 bg-transparent p-0"
      >
        <span id={labelId} className="sr-only">
          PDF viewer for {fileName}
        </span>
        <ToolbarGroup>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <ToolbarButton
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={page <= 1}
                        aria-label="Previous page"
                        onClick={() => goTo(page - 1)}
                      />
                    }
                  />
                }
              >
                <ChevronLeft />
              </TooltipTrigger>
              <TooltipPopup>Previous page</TooltipPopup>
            </Tooltip>
            <span className="min-w-16 px-1 text-center text-muted-foreground text-sm tabular-nums">
              {pageCount ? `${page} / ${pageCount}` : "—"}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <ToolbarButton
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={page >= pageCount}
                        aria-label="Next page"
                        onClick={() => goTo(page + 1)}
                      />
                    }
                  />
                }
              >
                <ChevronRight />
              </TooltipTrigger>
              <TooltipPopup>Next page</TooltipPopup>
            </Tooltip>
          </TooltipProvider>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <ToolbarButton
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={scale <= MIN_SCALE}
                        aria-label="Zoom out"
                        onClick={() => zoomBy(-SCALE_STEP)}
                      />
                    }
                  />
                }
              >
                <Minus />
              </TooltipTrigger>
              <TooltipPopup>Zoom out</TooltipPopup>
            </Tooltip>
            <Button
              type="button"
              variant={zoomMode === "fit" ? "secondary" : "ghost"}
              size="sm"
              onClick={fitToWidth}
            >
              Fit width
            </Button>
            {zoomMode === "custom" ? (
              <span className="min-w-12 px-1 text-center text-muted-foreground text-sm tabular-nums">
                {Math.round(scale * 100)}%
              </span>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={
                  <ToolbarButton
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={scale >= MAX_SCALE}
                        aria-label="Zoom in"
                        onClick={() => zoomBy(SCALE_STEP)}
                      />
                    }
                  />
                }
              >
                <Plus />
              </TooltipTrigger>
              <TooltipPopup>Zoom in</TooltipPopup>
            </Tooltip>
          </TooltipProvider>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup className="ms-auto">
          <ToolbarButton
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!fullscreenEnabled}
                onClick={() => void toggleFullscreen()}
              />
            }
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </ToolbarButton>
        </ToolbarGroup>
        {downloadHref ? (
          <>
            <ToolbarSeparator />
            <ToolbarGroup>
              <ToolbarButton
                render={
                  <Button
                    variant="outline"
                    className="no-underline"
                    size="sm"
                    render={
                      // biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
                      <a
                        href={downloadHref}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Download ${fileName}`}
                      />
                    }
                  />
                }
              >
                <Download />
                Download
              </ToolbarButton>
            </ToolbarGroup>
          </>
        ) : null}
      </Toolbar>

      <div
        ref={containerRef}
        className={`${isFullscreen ? "min-h-0 flex-1" : "h-[70vh]"} w-full min-w-0 max-w-full overflow-auto overscroll-contain rounded-lg border bg-muted/40`}
      >
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
            <Spinner />
            <Skeleton className="h-[80%] w-[70%] max-w-xl" />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="p-6 text-muted-foreground text-sm">
            {error}
          </p>
        ) : null}
        {pdf && !loading && !error ? (
          <div
            ref={pagesRef}
            className="flex w-max min-w-full flex-col items-center gap-4 p-4"
          >
            {pageNumbers(pageCount).map((pageNumber) => (
              <PdfPage
                key={pageNumber}
                pdf={pdf}
                pageNumber={pageNumber}
                scale={scale}
                scrollRoot={containerRef}
                onVisible={setPage}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PdfPage({
  pdf,
  pageNumber,
  scale,
  scrollRoot,
  onVisible,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  onVisible: (page: number) => void;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [isNearby, setIsNearby] = useState(false);
  const [pageSize, setPageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void pdf.getPage(pageNumber).then((pdfPage) => {
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale });
      setPageSize({ width: viewport.width, height: viewport.height });
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsNearby(entry.isIntersecting);
          if (entry.intersectionRatio >= 0.4) onVisible(pageNumber);
        }
      },
      {
        root: scrollRoot.current,
        rootMargin: "100% 0px",
        threshold: [0, 0.4],
      },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [onVisible, pageNumber, scrollRoot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const textLayerNode = textLayerRef.current;
    if (!isNearby || !canvas || !textLayerNode) return;
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    let textLayer: PDFTextLayer | undefined;

    async function draw() {
      const pdfjs = await import("pdfjs-dist");
      const page = await pdf.getPage(pageNumber);
      if (cancelled || !canvas || !textLayerNode) return;
      const viewport = page.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      const transform =
        outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0];
      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform,
      });
      textLayerNode.replaceChildren();
      textLayer = new pdfjs.TextLayer({
        container: textLayerNode,
        textContentSource: page.streamTextContent(),
        viewport,
      });
      try {
        await Promise.all([renderTask.promise, textLayer.render()]);
      } catch (caught) {
        if (
          caught &&
          typeof caught === "object" &&
          "name" in caught &&
          (caught.name === "RenderingCancelledException" ||
            caught.name === "AbortException")
        ) {
          return;
        }
        throw caught;
      }
    }

    void draw();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [isNearby, pdf, pageNumber, scale]);

  return (
    <div
      ref={hostRef}
      data-page={pageNumber}
      className="relative max-w-full overflow-hidden rounded-md bg-background shadow-xs ring-1 ring-black/10 dark:ring-white/10"
      style={
        {
          "--total-scale-factor": scale,
          width: pageSize?.width ?? "min(100%, 48rem)",
          aspectRatio: pageSize
            ? `${pageSize.width} / ${pageSize.height}`
            : "8.5 / 11",
        } as React.CSSProperties
      }
    >
      {isNearby ? (
        <>
          <canvas ref={canvasRef} />
          <div ref={textLayerRef} className="textLayer" />
        </>
      ) : null}
    </div>
  );
}
