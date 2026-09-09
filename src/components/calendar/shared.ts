import type { inferRouterOutputs } from "@trpc/server";
import type { TRPCRouter } from "@/integrations/trpc/router";

/** Dated Canvas event or assignment returned by `calendarEvents`. */
export type CalendarItem =
  inferRouterOutputs<TRPCRouter>["canvas"]["calendarEvents"][number];

const dateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formats a local calendar day as `YYYY-MM-DD`. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a `YYYY-MM-DD` key into a local Date at midnight. */
export function parseDateKey(key: string): Date | null {
  const match = dateKeyPattern.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** First and last days of the month that contains `month`. */
export function monthRange(month: Date): {
  startDate: string;
  endDate: string;
} {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { startDate: toDateKey(start), endDate: toDateKey(end) };
}

/** Local day key for a calendar item, preferring Canvas all-day dates. */
export function itemDateKey(item: CalendarItem): string | null {
  if (item.all_day_date && dateKeyPattern.test(item.all_day_date)) {
    return item.all_day_date;
  }
  const raw = item.start_at;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
}

/** Groups items by local day key. */
export function groupItemsByDay(
  items: CalendarItem[],
): Map<string, CalendarItem[]> {
  const groups = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = itemDateKey(item);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

/** Context codes Canvas accepts for this user's personal and course calendars. */
export function calendarContextCodes(input: {
  userId: string;
  courseIds: string[];
}): string[] {
  const codes = [
    `user_${input.userId}`,
    ...input.courseIds.map((id) => `course_${id}`),
  ];
  return codes
    .filter((code) => /^(user|course|group)_\d+$/.test(code))
    .slice(0, 50);
}

export function formatDayHeading(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatMonthHeading(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatEventTime(item: CalendarItem): string {
  if (item.all_day) return "All day";
  if (!item.start_at) return "Time TBA";
  const start = new Date(item.start_at);
  if (Number.isNaN(start.getTime())) return "Time TBA";
  const startLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
  if (!item.end_at) return startLabel;
  const end = new Date(item.end_at);
  if (Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) {
    return startLabel;
  }
  const endLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}
