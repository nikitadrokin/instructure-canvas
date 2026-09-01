import type React from "react";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

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
			<CardHeader>
				<CardDescription>{label}</CardDescription>
				<CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
				<CardAction className="text-muted-foreground [&_svg]:size-5">
					{icon}
				</CardAction>
			</CardHeader>
			<CardContent className="text-muted-foreground text-sm">
				{note}
			</CardContent>
		</Card>
	);
}
