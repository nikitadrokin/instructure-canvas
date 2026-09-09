import type React from "react";
import { CanvasLogo } from "@/components/canvas-logo/canvas-logo";
import { cn } from "@/lib/utils";

export function Brand({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 font-semibold text-sm tracking-tight",
        className,
      )}
    >
      <CanvasLogo className="size-7" decorative size="sm" />
      Canvas Local
    </div>
  );
}
