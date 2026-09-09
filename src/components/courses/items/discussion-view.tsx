import { MessagesSquare } from "lucide-react";
import type React from "react";
import {
	CanvasHtml,
	formatDateTime,
	PersonAvatar,
} from "@/components/courses/items/shared";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type {
	CanvasDiscussionEntry,
	CanvasDiscussionTopic,
} from "@/integrations/canvas/client";

type Participant = {
	display_name?: string | null;
	avatar_image_url?: string | null;
};

export function DiscussionView({
	topic,
	entries,
	participants,
}: {
	topic: CanvasDiscussionTopic;
	entries: CanvasDiscussionEntry[];
	participants: Array<{
		id?: string;
		display_name?: string | null;
		avatar_image_url?: string | null;
	}>;
}): React.ReactElement {
	const people = new Map<string, Participant>(
		participants
			.filter((person): person is typeof person & { id: string } =>
				Boolean(person.id),
			)
			.map((person) => [
				person.id,
				{
					display_name: person.display_name,
					avatar_image_url: person.avatar_image_url,
				},
			]),
	);
	const visible = entries.filter((entry) => !entry.deleted);

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<PersonAvatar
							name={topic.author?.display_name}
							src={topic.author?.avatar_image_url}
							className="size-9"
						/>
						<div className="flex min-w-0 flex-col">
							<CardTitle className="text-base">
								{topic.author?.display_name ?? "Discussion prompt"}
							</CardTitle>
							<CardDescription>
								{topic.posted_at ? formatDateTime(topic.posted_at) : "Prompt"}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{topic.message ? (
						<CanvasHtml html={topic.message} />
					) : (
						<p className="text-muted-foreground text-sm">
							This discussion has no prompt text.
						</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<MessagesSquare className="size-4" />
						Replies
					</CardTitle>
					<CardDescription>
						{topic.discussion_subentry_count
							? `${topic.discussion_subentry_count} total`
							: `${visible.length} shown`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{visible.length ? (
						<ul className="flex flex-col gap-5">
							{visible.map((entry) => (
								<EntryNode key={entry.id} entry={entry} people={people} />
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-sm">
							No replies have been posted yet.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function EntryNode({
	entry,
	people,
}: {
	entry: CanvasDiscussionEntry;
	people: Map<string, Participant>;
}): React.ReactElement {
	const person = entry.user_id ? people.get(entry.user_id) : undefined;
	const replies = (entry.replies ?? []).filter((reply) => !reply.deleted);

	return (
		<li className="flex flex-col gap-4">
			<div className="flex gap-3">
				<PersonAvatar
					name={person?.display_name}
					src={person?.avatar_image_url}
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex flex-wrap items-baseline gap-x-2">
						<span className="font-medium text-sm">
							{person?.display_name ?? "Participant"}
						</span>
						{entry.created_at ? (
							<span className="text-muted-foreground text-xs">
								{formatDateTime(entry.created_at)}
							</span>
						) : null}
					</div>
					{entry.message ? (
						<CanvasHtml html={entry.message} />
					) : (
						<p className="text-muted-foreground text-sm italic">
							This reply was removed.
						</p>
					)}
				</div>
			</div>
			{replies.length ? (
				<ul className="flex flex-col gap-4 border-s ps-4 sm:ms-4">
					{replies.map((reply) => (
						<EntryNode key={reply.id} entry={reply} people={people} />
					))}
				</ul>
			) : null}
		</li>
	);
}
