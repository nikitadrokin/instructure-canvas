import { AlertCircle, ArrowRight, Globe, Lock, ShieldCheck } from "lucide-react";
import type React from "react";
import { Brand } from "@/components/brand";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";

const TOKEN_HELP_URL =
	"https://community.instructure.com/en/kb/articles/662901-how-do-i-manage-api-access-tokens-in-my-user-account";

export interface ConnectScreenProps {
	canvasUrl: string;
	error?: string;
	isPending: boolean;
	onCanvasUrlChange: (value: string) => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
	tokenInput: React.RefObject<HTMLInputElement | null>;
}

export function ConnectScreen({
	canvasUrl,
	error,
	isPending,
	onCanvasUrlChange,
	onSubmit,
	tokenInput,
}: ConnectScreenProps): React.ReactElement {
	return (
		<div className="flex min-h-screen flex-col px-6">
			<header className="flex h-20 items-center justify-between">
				<Brand />
				<span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-muted-foreground text-xs">
					<span
						aria-hidden="true"
						className="size-1.5 rounded-full bg-success"
					/>
					Local session
				</span>
			</header>

			<main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
				<div className="mb-6 flex flex-col gap-2 text-center">
					<p className="font-medium text-primary text-xs uppercase tracking-widest">
						A calmer Canvas dashboard
					</p>
					<h1 className="font-heading font-semibold text-3xl tracking-tight">
						Your classes, without the clutter.
					</h1>
					<p className="text-balance text-muted-foreground text-sm">
						Connect your school&rsquo;s Canvas account to see courses, grades,
						and upcoming work in one focused view.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Connect to Canvas</CardTitle>
						<CardDescription>
							Use a personal access token from your own account.
						</CardDescription>
					</CardHeader>

					<CardContent>
						<form
							onSubmit={onSubmit}
							aria-busy={isPending}
							className="flex flex-col gap-4"
						>
							<Field>
								<FieldLabel htmlFor="canvas-url">Canvas domain</FieldLabel>
								<InputGroup>
									<InputGroupAddon>
										<Globe />
									</InputGroupAddon>
									<InputGroupInput
										id="canvas-url"
										name="canvas-url"
										type="text"
										inputMode="url"
										autoCapitalize="none"
										autoCorrect="off"
										placeholder="school.instructure.com"
										value={canvasUrl}
										onChange={(event) => onCanvasUrlChange(event.target.value)}
										aria-invalid={error ? true : undefined}
										required
									/>
								</InputGroup>
							</Field>

							<Field>
								<div className="flex w-full items-center justify-between gap-3">
									<FieldLabel htmlFor="canvas-token">
										Personal access token
									</FieldLabel>
									<a
										className="text-primary text-xs underline-offset-4 hover:underline"
										href={TOKEN_HELP_URL}
										target="_blank"
										rel="noreferrer"
									>
										Where do I find this?
									</a>
								</div>
								<InputGroup>
									<InputGroupAddon>
										<Lock />
									</InputGroupAddon>
									<InputGroupInput
										ref={tokenInput}
										id="canvas-token"
										name="canvas-token"
										type="password"
										autoComplete="off"
										placeholder="Paste your token"
										aria-invalid={error ? true : undefined}
										required
									/>
								</InputGroup>
							</Field>

							{error ? (
								<Alert variant="error">
									<AlertCircle />
									<AlertTitle>Couldn&rsquo;t connect</AlertTitle>
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							) : null}

							<Button
								type="submit"
								size="lg"
								loading={isPending}
								className="mt-1 w-full"
							>
								Open my dashboard
								<ArrowRight />
							</Button>
						</form>
					</CardContent>

					<CardFooter className="gap-3 border-t text-muted-foreground text-xs">
						<ShieldCheck className="size-4 shrink-0" />
						<p>
							<span className="font-medium text-foreground">
								Saved on this device.
							</span>{" "}
							Your school and token stay in this browser until you disconnect.
						</p>
					</CardFooter>
				</Card>
			</main>
		</div>
	);
}
