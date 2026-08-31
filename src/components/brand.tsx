import { GraduationCap } from "lucide-react";
import type React from "react";
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
			<span
				aria-hidden="true"
				className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground"
			>
				<GraduationCap className="size-4" />
			</span>
			Canvas Local
		</div>
	);
}
