import type React from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
	icon,
	label,
	value,
	note,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	note: string;
}): React.ReactElement {
	return (
		<Card>
			<CardContent className="flex items-center gap-4 p-5">
				<span
					aria-hidden="true"
					className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5"
				>
					{icon}
				</span>
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="text-muted-foreground text-xs uppercase tracking-wide">
						{label}
					</span>
					<strong className="font-heading font-semibold text-2xl tabular-nums">
						{value}
					</strong>
					<small className="truncate text-muted-foreground text-xs">
						{note}
					</small>
				</div>
			</CardContent>
		</Card>
	);
}
