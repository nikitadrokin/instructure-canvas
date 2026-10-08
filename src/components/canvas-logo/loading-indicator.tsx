import type React from "react";
import { CanvasLogo } from "@/components/canvas-logo/canvas-logo";
import { cn } from "@/lib/utils";

/**
 * Props for the Canvas-mark loading indicator.
 */
export interface LoadingIndicatorProps {
  /** Status text shown under the mark and announced to assistive tech. */
  label: string;
  /** Size of the mark. */
  size?: "lg" | "md";
  className?: string;
}

/**
 * Loading state for large UI pieces that have no skeleton, such as PDFs.
 * Renders the interactive Canvas mark with a status label.
 */
export function LoadingIndicator({
  label,
  size = "md",
  className,
}: LoadingIndicatorProps): React.ReactElement {
  return (
    <output
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 text-center",
        className,
      )}
    >
      <CanvasLogo decorative size={size} />
      <span className="text-muted-foreground text-sm">{label}</span>
    </output>
  );
}
