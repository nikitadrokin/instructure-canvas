import { ChevronRight } from "lucide-react";
import type React from "react";
import {
  formatOverdueLabel,
  type MissingItem,
} from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";

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
      className="flex items-center gap-3 px-6 py-3.5 outline-none transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-accent/40 focus-visible:bg-accent/40"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-sm">{item.name}</span>
        <span className="truncate text-muted-foreground text-xs">
          {contextLabel} · {formatOverdueLabel(item.due_at)}
        </span>
      </div>
      <Badge variant="warning" size="sm">
        Overdue
      </Badge>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
