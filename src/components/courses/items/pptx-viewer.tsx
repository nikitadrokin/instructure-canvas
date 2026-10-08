import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LoadingIndicator } from "@/components/canvas-logo/loading-indicator";
import { Button } from "@/components/ui/button";
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

/** Width in px that slides are rendered at before CSS zoom is applied. */
const BASE_WIDTH = 1280;
const MIN_SCALE = 0.25;
const MAX_FIT_SCALE = 2;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;
/** Decks larger than this are not parsed in the browser. */
const MAX_BYTES = 100 * 1024 * 1024;
const SLIDE_SELECTOR = ".pptx-preview-slide-wrapper";

type PptxPreviewer = ReturnType<typeof import("pptx-preview").init>;

function ToolbarIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ToolbarButton
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label={label}
                onClick={onClick}
              />
            }
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

/**
 * Inline PowerPoint (.pptx) viewer. The deck is fetched through the same-origin
 * Canvas file proxy and rendered to DOM in the browser, so nothing is uploaded
 * to a third-party converter.
 */
export function PptxViewer({
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
  const hostRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<Element[]>([]);
  const [slideCount, setSlideCount] = useState(0);
  const [slide, setSlide] = useState(1);
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

  const applyFitWidth = useCallback((observedWidth?: number) => {
    const container = containerRef.current;
    if (!container || userZoomed.current) return;
    const width = (observedWidth ?? container.clientWidth) - 32;
    if (width <= 0) return;
    setScale(Math.min(MAX_FIT_SCALE, Math.max(MIN_SCALE, width / BASE_WIDTH)));
    setZoomMode("fit");
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const controller = new AbortController();
    let previewer: PptxPreviewer | undefined;

    async function load(target: HTMLDivElement) {
      setLoading(true);
      setError(null);
      setSlideCount(0);
      setSlide(1);
      setZoomMode("fit");
      userZoomed.current = false;
      slidesRef.current = [];

      try {
        const { canvasUrl, token } = useCanvasStore.getState();
        const headers: Record<string, string> =
          canvasUrl && token
            ? { Authorization: `Bearer ${token}`, "X-Canvas-Url": canvasUrl }
            : {};
        const [response, pptx] = await Promise.all([
          fetch(src, { headers, signal: controller.signal }),
          import("pptx-preview"),
        ]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const length = Number(response.headers.get("Content-Length") ?? 0);
        if (length > MAX_BYTES) {
          setError("This presentation is too large to preview. Download it.");
          setLoading(false);
          return;
        }
        const buffer = await response.arrayBuffer();
        if (controller.signal.aborted) return;
        if (buffer.byteLength > MAX_BYTES) {
          setError("This presentation is too large to preview. Download it.");
          setLoading(false);
          return;
        }

        target.replaceChildren();
        previewer = pptx.init(target, { width: BASE_WIDTH, mode: "list" });
        await previewer.preview(buffer);
        if (controller.signal.aborted) return;

        const slides = Array.from(
          target.querySelectorAll<HTMLElement>(SLIDE_SELECTOR),
        );
        if (!slides.length) {
          setError("This presentation has no slides to display.");
          setLoading(false);
          return;
        }
        slidesRef.current = slides;
        setSlideCount(slides.length);
        setLoading(false);
      } catch {
        if (controller.signal.aborted) return;
        setError(
          "This presentation could not be displayed. Try downloading it instead.",
        );
        setLoading(false);
      }
    }

    void load(host);
    return () => {
      controller.abort();
      slidesRef.current = [];
      previewer?.destroy();
      host.replaceChildren();
    };
  }, [src]);

  useEffect(() => {
    if (!slideCount) return;
    applyFitWidth();
  }, [slideCount, applyFitWidth]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      const width = node.clientWidth;
      if (Math.abs(width - measuredWidth.current) < 0.5) return;
      measuredWidth.current = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applyFitWidth(width));
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [applyFitWidth]);

  // Track which slide crosses the vertical center of the scroll area.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !slideCount || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = slidesRef.current.indexOf(entry.target);
          if (index >= 0) setSlide(index + 1);
        }
      },
      { root, rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    for (const element of slidesRef.current) observer.observe(element);
    return () => observer.disconnect();
  }, [slideCount]);

  const zoomBy = (delta: number) => {
    userZoomed.current = true;
    setZoomMode("custom");
    setScale((current) =>
      Math.min(MAX_SCALE, Math.max(MIN_SCALE, current + delta)),
    );
  };

  const fitToWidth = () => {
    userZoomed.current = false;
    applyFitWidth();
  };

  const goTo = (next: number) => {
    if (next < 1 || next > slideCount) return;
    setSlide(next);
    slidesRef.current[next - 1]?.scrollIntoView({ block: "start" });
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
          Presentation viewer for {fileName}
        </span>
        <TooltipProvider>
          <ToolbarGroup>
            <ToolbarIconButton
              label="Previous slide"
              disabled={slide <= 1}
              onClick={() => goTo(slide - 1)}
            >
              <ChevronLeft />
            </ToolbarIconButton>
            <span className="min-w-16 px-1 text-center text-muted-foreground text-sm tabular-nums">
              {slideCount ? `${slide} / ${slideCount}` : "—"}
            </span>
            <ToolbarIconButton
              label="Next slide"
              disabled={slide >= slideCount}
              onClick={() => goTo(slide + 1)}
            >
              <ChevronRight />
            </ToolbarIconButton>
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarGroup>
            <ToolbarIconButton
              label="Zoom out"
              disabled={scale <= MIN_SCALE}
              onClick={() => zoomBy(-SCALE_STEP)}
            >
              <Minus />
            </ToolbarIconButton>
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
            <ToolbarIconButton
              label="Zoom in"
              disabled={scale >= MAX_SCALE}
              onClick={() => zoomBy(SCALE_STEP)}
            >
              <Plus />
            </ToolbarIconButton>
          </ToolbarGroup>
        </TooltipProvider>
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
          <LoadingIndicator label={`Loading ${fileName}…`} className="h-full" />
        ) : null}
        {error ? (
          <p role="alert" className="p-6 text-muted-foreground text-sm">
            {error}
          </p>
        ) : null}
        {/* Kept laid out (not display:none) while loading so charts can size themselves. */}
        <div
          className={cn(
            "flex w-max min-w-full justify-center p-4",
            (loading || error) && "invisible h-0 overflow-hidden p-0",
          )}
        >
          <div
            ref={hostRef}
            className={cn(
              "shrink-0",
              "[&_.pptx-preview-wrapper]:bg-transparent!",
              "[&_.pptx-preview-slide-wrapper]:mb-4! [&_.pptx-preview-slide-wrapper]:rounded-md [&_.pptx-preview-slide-wrapper]:shadow-xs [&_.pptx-preview-slide-wrapper]:ring-1 [&_.pptx-preview-slide-wrapper]:ring-black/10 dark:[&_.pptx-preview-slide-wrapper]:ring-white/10",
            )}
            style={{ width: BASE_WIDTH, zoom: scale }}
          />
        </div>
      </div>
    </div>
  );
}
