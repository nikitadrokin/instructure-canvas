import { ChevronRight } from "lucide-react";
import type React from "react";
import {
	formatDay,
	formatMonth,
	formatTime,
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
			className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
		>
			<div
				aria-hidden="true"
				className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/40"
			>
				<span className="font-semibold text-[0.625rem] text-muted-foreground uppercase">
					{dueAt ? formatMonth(dueAt) : "TBD"}
				</span>
				<strong className="font-heading text-base leading-none">
					{dueAt ? formatDay(dueAt) : "—"}
				</strong>
			</div>
			<div className="flex min-w-0 flex-col">
				<strong className="truncate font-medium text-sm">{title}</strong>
				<span className="truncate text-muted-foreground text-xs">
					{contextLabel} · {dueAt ? formatTime(dueAt) : "No due date"}
				</span>
			</div>
			<ChevronRight className="ms-auto size-4 shrink-0 text-muted-foreground" />
		</a>
	);
}
