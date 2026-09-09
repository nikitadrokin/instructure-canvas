import type React from "react";
import { CanvasHtml, formatDateTime } from "@/components/courses/items/shared";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { CanvasPage } from "@/integrations/canvas/client";

export function PageView({ page }: { page: CanvasPage }): React.ReactElement {
	return (
		<Card>
			<CardContent className="pt-6">
				{page.body ? (
					<CanvasHtml html={page.body} />
				) : (
					<p className="text-muted-foreground text-sm">This page is empty.</p>
				)}
			</CardContent>
			{page.updated_at ? (
				<CardFooter className="border-t text-muted-foreground text-xs">
					Last updated {formatDateTime(page.updated_at)}
				</CardFooter>
			) : null}
		</Card>
	);
}
