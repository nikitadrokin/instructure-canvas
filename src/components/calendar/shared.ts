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

/** Sunday-start six-week grid that a month view actually displays. */
export function visibleGridRange(month: Date): {
  startDate: string;
  endDate: string;
} {
  const days = monthGridDays(month);
  const start = days[0];
  const end = days[days.length - 1];
  if (!start || !end) return monthRange(month);
  return { startDate: toDateKey(start), endDate: toDateKey(end) };
}

/** 42 local dates covering the visible month grid, starting on Sunday. */
export function monthGridDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

/** Localized short weekday labels starting on Sunday. */
export function weekdayLabels(): string[] {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(2023, 0, 1 + index)),
  );
}

export function isSameDay(left: Date, right: Date): boolean {
  return toDateKey(left) === toDateKey(right);
}

export function isSameMonth(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
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

const hexPattern = /^#([\da-f]{3}|[\da-f]{6})$/i;

/** Canvas-like fallbacks when a context has no saved custom color. */
const fallbackPalette = [
  "#394B9F",
  "#3B80D1",
  "#0097C7",
  "#009788",
  "#43A047",
  "#7CB342",
  "#F4511F",
  "#E53935",
  "#D81B60",
  "#8E24AA",
] as const;

/** Course or personal calendar the user can show or hide. */
export type CalendarSource = {
  code: string;
  label: string;
};

/** Safe hex plus contrasting label color for colored chips. */
export type CalendarSwatch = {
  hex: string;
  foreground: "#0a0a0a" | "#ffffff";
};

/** Personal calendar plus each enrolled course, matching Canvas context codes. */
export function calendarSources(input: {
  userId: string;
  courses: Array<{ id: string; name: string | null; course_code: string }>;
}): CalendarSource[] {
  return [
    { code: `user_${input.userId}`, label: "Personal calendar" },
    ...input.courses.map((course) => ({
      code: `course_${course.id}`,
      label: course.name?.trim() || course.course_code,
    })),
  ].filter((source) => /^(user|course|group)_\d+$/.test(source.code));
}

/** Accepts only `#rgb` / `#rrggbb` so API values cannot inject CSS. */
export function parseCalendarHex(value: string): string | null {
  const trimmed = value.trim();
  if (!hexPattern.test(trimmed)) return null;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    if (!r || !g || !b) return null;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function hashCode(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

function relativeLuminance(hex: string): number {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return (
    0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue)
  );
}

/**
 * Color for a Canvas context. Uses GET /users/self/colors when present,
 * otherwise a stable hash into a fallback palette.
 */
export function calendarSwatch(
  contextCode: string | undefined,
  customColors: Record<string, string>,
): CalendarSwatch {
  const raw = contextCode ? customColors[contextCode] : undefined;
  const custom = raw ? parseCalendarHex(raw) : null;
  const fallback =
    fallbackPalette[hashCode(contextCode ?? "user") % fallbackPalette.length] ??
    "#394B9F";
  const hex = custom ?? fallback;
  return {
    hex,
    foreground: relativeLuminance(hex) > 0.55 ? "#0a0a0a" : "#ffffff",
  };
}

/** Client-side calendar filter. Items without a context stay visible. */
export function filterItemsByContext(
  items: CalendarItem[],
  visibleCodes: ReadonlySet<string>,
): CalendarItem[] {
  return items.filter((item) => {
    if (!item.context_code) return true;
    return visibleCodes.has(item.context_code);
  });
}

/** Sunday of the week that contains `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

/** Seven local dates for the week containing `date`, starting Sunday. */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

/** Inclusive Canvas `start_date` / `end_date` for the visible week. */
export function weekRange(date: Date): { startDate: string; endDate: string } {
  const days = weekDays(date);
  const start = days[0];
  const end = days[6];
  if (!start || !end) {
    const key = toDateKey(date);
    return { startDate: key, endDate: key };
  }
  return { startDate: toDateKey(start), endDate: toDateKey(end) };
}

export function formatWeekHeading(date: Date): string {
  const days = weekDays(date);
  const start = days[0];
  const end = days[6];
  if (!start || !end) return formatMonthHeading(date);
  const startLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}

export function formatHourLabel(hour: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(
    new Date(2023, 0, 1, hour),
  );
}

export const weekDayStartMinutes = 7 * 60;
export const weekDayEndMinutes = 21 * 60;
export const weekDaySpanMinutes = weekDayEndMinutes - weekDayStartMinutes;

export function isUntimedItem(item: CalendarItem): boolean {
  return item.all_day || !item.start_at;
}

/**
 * Positions a timed event in the 7:00–21:00 week column.
 * Events outside that window are clamped so they stay visible.
 */
export function timedEventLayout(
  item: CalendarItem,
  day: Date,
): { top: number; height: number } | null {
  if (isUntimedItem(item) || !item.start_at) return null;
  const start = new Date(item.start_at);
  if (Number.isNaN(start.getTime()) || toDateKey(start) !== toDateKey(day)) {
    return null;
  }
  const end = item.end_at
    ? new Date(item.end_at)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = Number.isNaN(end.getTime())
    ? startMin + 60
    : end.getHours() * 60 + end.getMinutes();
  const clampedStart = Math.min(
    weekDayEndMinutes - 20,
    Math.max(weekDayStartMinutes, startMin),
  );
  const clampedEnd = Math.min(
    weekDayEndMinutes,
    Math.max(clampedStart + 20, endMin),
  );
  return {
    top: ((clampedStart - weekDayStartMinutes) / weekDaySpanMinutes) * 100,
    height: ((clampedEnd - clampedStart) / weekDaySpanMinutes) * 100,
  };
}
