import type React from "react";
import {
  formatDueLabel,
  type UpcomingItem,
} from "@/components/dashboard/shared";

export function UpcomingRow({
  item,
  origin,
}: {
  item: UpcomingItem;
  origin: string;
}): React.ReactElement {
  const dueAt = item.assignment?.due_at ?? item.start_at;
  const title = item.assignment?.name ?? item.title;
  const href = item.assignment?.html_url ?? item.html_url ?? origin;
  const contextLabel = item.context_name ?? "Canvas";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-baseline justify-between gap-4 px-5 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-sm">{title}</span>
        <span className="truncate text-muted-foreground text-xs">
          {contextLabel}
        </span>
      </div>
      <span className="shrink-0 whitespace-nowrap text-muted-foreground text-xs tabular-nums">
        {formatDueLabel(dueAt)}
      </span>
    </a>
  );
}
