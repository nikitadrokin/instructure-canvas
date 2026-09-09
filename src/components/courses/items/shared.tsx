import type React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

export function formatDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

export function formatBytes(size: number): string {
	if (size < 1024) return `${size} B`;
	const units = ["KB", "MB", "GB"];
	let value = size;
	let unit = "B";
	for (const next of units) {
		if (value < 1024) break;
		value /= 1024;
		unit = next;
	}
	return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
}

/** Two-letter initials for an avatar fallback. */
export function initials(name?: string | null): string {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Person avatar with image + initials fallback, used in comment threads. */
export function PersonAvatar({
	name,
	src,
	className,
}: {
	name?: string | null;
	src?: string | null;
	className?: string;
}): React.ReactElement {
	return (
		<Avatar className={cn("size-8", className)}>
			{src ? <AvatarImage src={src} alt="" /> : null}
			<AvatarFallback>{initials(name)}</AvatarFallback>
		</Avatar>
	);
}

/** Renders sanitized rich HTML returned by the Canvas API. */
export function CanvasHtml({
	html,
	className,
}: {
	html: string;
	className?: string;
}): React.ReactElement {
	return (
		<div
			className={cn("canvas-content", className)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Canvas sanitizes rich content server-side before the API returns it
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
