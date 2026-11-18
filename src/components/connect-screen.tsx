import { AlertCircle } from "lucide-react";
import type React from "react";
import { CanvasLogo } from "@/components/canvas-logo/canvas-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
      <header className="flex h-20 items-center justify-end">
        <ModeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        <CanvasLogo size="lg" className="mb-6" />
        <h1 className="font-heading font-medium text-4xl leading-[1.15] tracking-[-0.025em]">
          Connect your Canvas account
        </h1>
        <p className="mt-3 mb-8 text-muted-foreground text-sm">
          Your school and access token stay in this browser until you
          disconnect.
        </p>

        <form
          onSubmit={onSubmit}
          aria-busy={isPending}
          className="flex flex-col gap-5"
        >
          <Field>
            <FieldLabel htmlFor="canvas-url">Canvas domain</FieldLabel>
            <Input
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
          </Field>

          <Field>
            <div className="flex w-full items-baseline justify-between gap-3">
              <FieldLabel htmlFor="canvas-token">
                Personal access token
              </FieldLabel>
              <a
                className="text-muted-foreground text-xs underline decoration-[0.09em] underline-offset-[0.2em] hover:text-foreground"
                href={TOKEN_HELP_URL}
                target="_blank"
                rel="noreferrer"
              >
                Where do I find this?
              </a>
            </div>
            <Input
              ref={tokenInput}
              id="canvas-token"
              name="canvas-token"
              type="password"
              autoComplete="off"
              placeholder="Paste your token"
              aria-invalid={error ? true : undefined}
              required
            />
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
            className="w-full"
          >
            Connect
          </Button>
        </form>
      </main>
    </div>
  );
}
