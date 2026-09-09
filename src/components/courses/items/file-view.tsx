import { Download, FileText, ImageIcon } from "lucide-react";
import type React from "react";
import { formatBytes, formatDateTime } from "@/components/courses/items/shared";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { CanvasFile } from "@/integrations/canvas/client";

function isImage(file: CanvasFile): boolean {
	return (
		file.mime_class === "image" ||
		Boolean(file["content-type"]?.startsWith("image/"))
	);
}

function isPdf(file: CanvasFile): boolean {
	return (
		file.mime_class === "pdf" || file["content-type"] === "application/pdf"
	);
}

export function FileView({ file }: { file: CanvasFile }): React.ReactElement {
	const meta = [
		file["content-type"],
		file.size != null ? formatBytes(file.size) : null,
		file.updated_at ? `Updated ${formatDateTime(file.updated_at)}` : null,
	].filter(Boolean);

	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardDescription className="flex items-center gap-1.5">
					{isImage(file) ? (
						<ImageIcon className="size-3.5" />
					) : (
						<FileText className="size-3.5" />
					)}
					File
				</CardDescription>
				<CardTitle className="break-words text-base">
					{file.display_name}
				</CardTitle>
				{meta.length ? (
					<CardDescription>{meta.join(" · ")}</CardDescription>
				) : null}
			</CardHeader>
			<CardContent className="flex flex-col items-start gap-4">
				{file.url && isImage(file) ? (
					<img
						src={file.url}
						alt={file.display_name}
						className="max-h-[70vh] w-full rounded-lg border object-contain"
					/>
				) : null}
				{file.url && isPdf(file) ? (
					<iframe
						title={file.display_name}
						src={file.url}
						className="h-[70vh] w-full rounded-lg border"
					/>
				) : null}
				{file.url ? (
					<Button
						render={
							// biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
							<a
								href={file.url}
								target="_blank"
								rel="noreferrer"
								aria-label={`Download ${file.display_name}`}
							/>
						}
					>
						<Download />
						Download
					</Button>
				) : (
					<p className="text-muted-foreground text-sm">
						This file has no download link.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
