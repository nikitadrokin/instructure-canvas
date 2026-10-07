import { useEffect } from "react";
import { formatPageTitle } from "@/lib/page-title";

/**
 * Sets the browser tab title from the given parts (most specific first).
 * Pass `undefined` for parts that are still loading; they are skipped.
 * Only leaf pages should call this: React runs child effects before parent
 * effects, so a layout that also set a title would overwrite its child.
 */
export function usePageTitle(
  ...parts: ReadonlyArray<string | null | undefined>
): void {
  const title = formatPageTitle(...parts);
  useEffect(() => {
    document.title = title;
  }, [title]);
}
