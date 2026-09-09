import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const logoVariants = cva("relative inline-grid place-items-center", {
  defaultVariants: {
    size: "md",
  },
  variants: {
    size: {
      lg: "size-44",
      md: "size-24",
      sm: "size-6",
    },
  },
});

/**
 * Shared layout constants for the SVG fallback, matching the WGSL SDF.
 */
const HEAD_X = 0.352;
const HEAD_R = 0.086;
const BODY_X = 0.588;
const BODY_R = 0.196;
const FIGURES = 8;
const SCALE = 42;
const CENTER = 50;

/**
 * Props for the Canvas community mark.
 */
export interface CanvasLogoProps
  extends VariantProps<typeof logoVariants>,
    Omit<React.ComponentProps<"div">, "children"> {
  /** When true, hide the mark from assistive tech because nearby text names it. */
  decorative?: boolean;
  /** Accessible name announced to assistive tech. */
  label?: string;
}

function figureAngle(index: number): number {
  return (index * Math.PI * 2) / FIGURES;
}

function CanvasLogoMark(): React.ReactElement {
  const people = Array.from({ length: FIGURES }, (_, index) => {
    const angle = figureAngle(index);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const headCx = CENTER + HEAD_X * SCALE * cos;
    const headCy = CENTER + HEAD_X * SCALE * sin;
    const bodyCx = CENTER + BODY_X * SCALE * cos;
    const bodyCy = CENTER + BODY_X * SCALE * sin;
    const radius = BODY_R * SCALE;
    const perpX = -sin;
    const perpY = cos;
    const startX = bodyCx + perpX * radius;
    const startY = bodyCy + perpY * radius;
    const endX = bodyCx - perpX * radius;
    const endY = bodyCy - perpY * radius;
    const path = [
      `M ${startX.toFixed(3)} ${startY.toFixed(3)}`,
      `A ${radius.toFixed(3)} ${radius.toFixed(3)} 0 0 1 ${endX.toFixed(3)} ${endY.toFixed(3)}`,
      "Z",
    ].join(" ");

    return { headCx, headCy, index, path };
  });

  return (
    <svg
      aria-hidden="true"
      className="size-full"
      fill="#e13f2b"
      viewBox="0 0 100 100"
    >
      {people.map((person) => (
        <g key={person.index}>
          <circle cx={person.headCx} cy={person.headCy} r={HEAD_R * SCALE} />
          <path d={person.path} />
        </g>
      ))}
    </svg>
  );
}

/**
 * Canvas LMS community mark. Prefers a WebGPU shader and falls back to SVG.
 */
export function CanvasLogo({
  className,
  decorative = false,
  label = "Canvas",
  size,
  ...props
}: CanvasLogoProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gpuReady, setGpuReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop = () => {};
    let cancelled = false;

    const mount = (reducedMotion: boolean) => {
      stop();
      setGpuReady(false);
      void import("./start-canvas-logo")
        .then(({ startCanvasLogo }) => {
          if (cancelled || canvasRef.current !== canvas) return;
          stop = startCanvasLogo(canvas, {
            onError: () => {
              if (!cancelled) setGpuReady(false);
            },
            onReady: () => {
              if (!cancelled) setGpuReady(true);
            },
            reducedMotion,
          });
        })
        .catch(() => {
          if (!cancelled) setGpuReady(false);
        });
    };

    const onMotionChange = () => {
      mount(motionQuery.matches);
    };

    mount(motionQuery.matches);
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      cancelled = true;
      motionQuery.removeEventListener("change", onMotionChange);
      stop();
    };
  }, []);

  return (
    <div
      {...props}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={cn("pointer-events-none", logoVariants({ size }), className)}
      role="img"
    >
      <span
        className={cn(
          "col-start-1 row-start-1 size-full",
          gpuReady && "hidden",
        )}
      >
        <CanvasLogoMark />
      </span>
      <canvas
        ref={canvasRef}
        className={cn(
          "col-start-1 row-start-1 size-full bg-transparent",
          gpuReady ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
