import { ChevronRight } from "lucide-react";
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
			className="flex items-center gap-3 px-6 py-3.5 outline-none transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-accent/40 focus-visible:bg-accent/40"
		>
			<div className="flex min-w-0 flex-col">
				<span className="truncate font-medium text-sm">{title}</span>
				<span className="truncate text-muted-foreground text-xs">
					{contextLabel} · {formatDueLabel(dueAt)}
				</span>
			</div>
			<ChevronRight className="ms-auto size-4 shrink-0 text-muted-foreground" />
		</a>
	);
}
