import type React from "react";

/**
 * Section title sitting under a hairline rule; the rule and the optional
 * mono aside repeat across every dashboard section.
 */
export function SectionHeader({
  id,
  title,
  aside,
  asideTone = "muted",
}: {
  id: string;
  title: string;
  aside?: string;
  asideTone?: "muted" | "signal";
}): React.ReactElement {
  return (
    <div
      className="mb-3 flex items-baseline justify-between gap-3 pt-3"
      style={{ borderTop: "var(--border-hairline) solid var(--foreground)" }}
    >
      <h2 id={id} className="font-heading font-medium text-lg">
        {title}
      </h2>
      {aside ? (
        <span
          className={
            asideTone === "signal"
              ? "eyebrow text-signal-foreground tabular-nums"
              : "eyebrow tabular-nums"
          }
        >
          {aside}
        </span>
      ) : null}
    </div>
  );
}
