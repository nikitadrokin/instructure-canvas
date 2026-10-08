import {
  createParser,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  isSameDay,
  isSameMonth,
  parseDateKey,
  toDateKey,
} from "@/components/calendar/shared";

const monthKeyPattern = /^(\d{4})-(\d{2})$/;

/** Selected local day, stored as `YYYY-MM-DD`. */
const parseAsDateKey = createParser({
  parse: (value) => parseDateKey(value),
  serialize: toDateKey,
  eq: isSameDay,
});

/** First day of the visible month, stored as `YYYY-MM`. */
const parseAsMonthKey = createParser({
  parse: (value) => {
    const match = monthKeyPattern.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    return new Date(year, month - 1, 1);
  },
  serialize: (value) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`,
  eq: isSameMonth,
});

/**
 * Calendar state kept in the URL so history and back navigation restore it.
 * Unset keys fall back to today, month view, and every calendar visible.
 * Updates replace the current history entry instead of adding new ones.
 */
export const calendarSearchParsers = {
  view: parseAsStringLiteral(["month", "week"] as const).withDefault("month"),
  date: parseAsDateKey,
  month: parseAsMonthKey,
  event: parseAsString,
  calendars: parseAsArrayOf(parseAsString),
};

export function useCalendarSearchParams() {
  return useQueryStates(calendarSearchParsers, { history: "replace" });
}
