import type React from "react";
import {
  formatOverdueLabel,
  type MissingItem,
} from "@/components/dashboard/shared";

export function MissingRow({
  item,
  origin,
}: {
  item: MissingItem;
  origin: string;
}): React.ReactElement {
  const href = item.html_url ?? origin;
  const contextLabel = item.course_name ?? "Canvas";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-baseline justify-between gap-4 px-5 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-sm">{item.name}</span>
        <span className="truncate text-muted-foreground text-xs">
          {contextLabel}
        </span>
      </div>
      <span className="shrink-0 whitespace-nowrap text-signal-foreground text-xs tabular-nums">
        {formatOverdueLabel(item.due_at)}
      </span>
    </a>
  );
}
