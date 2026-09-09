import { CircleHelp, Hash, Repeat, Timer, Trophy } from "lucide-react";
import type React from "react";
import { CanvasHtml, formatDateTime } from "@/components/courses/items/shared";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { CanvasQuiz } from "@/integrations/canvas/client";

export function QuizView({ quiz }: { quiz: CanvasQuiz }): React.ReactElement {
	const stats = [
		quiz.question_count != null
			? {
					icon: <Hash />,
					label: "Questions",
					value: String(quiz.question_count),
				}
			: null,
		quiz.points_possible != null
			? {
					icon: <Trophy />,
					label: "Points",
					value: String(quiz.points_possible),
				}
			: null,
		quiz.time_limit != null
			? {
					icon: <Timer />,
					label: "Time limit",
					value: `${quiz.time_limit} min`,
				}
			: null,
		quiz.allowed_attempts != null
			? {
					icon: <Repeat />,
					label: "Attempts",
					value:
						quiz.allowed_attempts === -1
							? "Unlimited"
							: String(quiz.allowed_attempts),
				}
			: null,
	].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardHeader>
					<CardDescription className="flex items-center gap-1.5">
						<CircleHelp className="size-3.5" />
						{quiz.quiz_type ? quiz.quiz_type.replaceAll("_", " ") : "Quiz"}
					</CardDescription>
					<CardTitle className="text-base">Overview</CardTitle>
				</CardHeader>
				{stats.length ? (
					<CardContent>
						<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
							{stats.map((stat) => (
								<div key={stat.label} className="flex flex-col gap-1">
									<dt className="flex items-center gap-1.5 text-muted-foreground text-xs [&_svg]:size-3.5">
										{stat.icon}
										{stat.label}
									</dt>
									<dd className="font-heading font-semibold text-xl tabular-nums">
										{stat.value}
									</dd>
								</div>
							))}
						</dl>
						{quiz.due_at ? (
							<p className="mt-4 text-muted-foreground text-sm">
								Due {formatDateTime(quiz.due_at)}.
							</p>
						) : null}
					</CardContent>
				) : null}
			</Card>

			{quiz.description ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Instructions</CardTitle>
					</CardHeader>
					<CardContent>
						<CanvasHtml html={quiz.description} />
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
