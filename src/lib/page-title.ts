/** Name shown in the browser tab when a page has no more specific title. */
export const SITE_TITLE = "Instructure Canvas";

/**
 * Joins title parts with " | ", most specific first, for example
 * `formatPageTitle('Week 1 reading', 'Biology 101')`. Empty parts are
 * skipped, and the site name is used when nothing is left.
 */
export function formatPageTitle(
  ...parts: ReadonlyArray<string | null | undefined>
): string {
  const kept = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return kept.length > 0 ? kept.join(" | ") : SITE_TITLE;
}
