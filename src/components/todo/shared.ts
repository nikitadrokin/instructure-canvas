import type { CanvasTodoItem } from "@/integrations/canvas/client";

/** Planner types that have a due date a student can fall behind on. */
const GRADED_TYPES = new Set([
  "assignment",
  "quiz",
  "discussion_topic",
  "sub_assignment",
]);

/** Days of history fetched so recently missed work shows as overdue. */
export const OVERDUE_LOOKBACK_DAYS = 14;

export type TodoWindow = 7 | 14 | 30;

export const TODO_WINDOWS: TodoWindow[] = [7, 14, 30];

/** Midnight at the start of a local calendar day. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** `YYYY-MM-DD` for a local calendar day. */
export function toDateParam(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Planner query range: the lookback window through the end of the chosen
 * window. Canvas `end_date` is exclusive of later days, so the day after the
 * last wanted day is sent.
 */
export function todoRange(
  now: Date,
  window: TodoWindow,
): { startDate: string; endDate: string } {
  const today = startOfLocalDay(now);
  return {
    startDate: toDateParam(addDays(today, -OVERDUE_LOOKBACK_DAYS)),
    endDate: toDateParam(addDays(today, window + 1)),
  };
}

export type TodoGroup = {
  /** `YYYY-MM-DD` local day, or `undated`. */
  key: string;
  label: string;
  items: CanvasTodoItem[];
};

export type TodoSections = {
  overdue: CanvasTodoItem[];
  groups: TodoGroup[];
};

/** "Today", "Tomorrow", or a weekday and date. */
export function dayLabel(day: Date, now: Date): string {
  const today = startOfLocalDay(now);
  const diff = Math.round(
    (startOfLocalDay(day).getTime() - today.getTime()) / 86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(day);
}

/**
 * Splits planner items into an overdue list and upcoming days.
 * Completed items are dropped unless `showCompleted` is set. Past items
 * that are not graded work (notes, events, announcements) are dropped.
 */
export function buildTodoSections(
  items: CanvasTodoItem[],
  now: Date,
  options: { window: TodoWindow; showCompleted: boolean },
): TodoSections {
  const today = startOfLocalDay(now);
  const last = addDays(today, options.window + 1).getTime();
  const overdue: CanvasTodoItem[] = [];
  const byDay = new Map<string, TodoGroup>();

  for (const item of items) {
    if (item.completed && !options.showCompleted) continue;
    if (!item.date) continue;
    const when = new Date(item.date);
    if (Number.isNaN(when.getTime())) continue;

    if (when.getTime() < today.getTime()) {
      if (!item.completed && !item.excused && GRADED_TYPES.has(item.type))
        overdue.push(item);
      continue;
    }
    if (when.getTime() >= last) continue;

    const key = toDateParam(when);
    const group = byDay.get(key);
    if (group) group.items.push(item);
    else byDay.set(key, { key, label: dayLabel(when, now), items: [item] });
  }

  return {
    overdue,
    groups: [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key)),
  };
}

/** Where a to-do item should link to. */
export type TodoLink =
  | { kind: "assignment"; courseId: string; id: string }
  | { kind: "quiz"; courseId: string; id: string }
  | { kind: "discussion"; courseId: string; id: string }
  | { kind: "external"; href: string }
  | { kind: "none" };

/** Prefers in-app pages for assignments, quizzes and discussions. */
export function todoLink(item: CanvasTodoItem): TodoLink {
  const { courseId } = item;
  if (courseId && /^\d+$/.test(item.id)) {
    if (item.type === "assignment")
      return { kind: "assignment", courseId, id: item.id };
    if (item.type === "quiz") return { kind: "quiz", courseId, id: item.id };
    if (item.type === "discussion_topic")
      return { kind: "discussion", courseId, id: item.id };
  }
  return item.htmlUrl
    ? { kind: "external", href: item.htmlUrl }
    : { kind: "none" };
}

/** Human label for a Canvas plannable type. */
export function todoTypeLabel(type: string): string {
  switch (type) {
    case "assignment":
    case "sub_assignment":
      return "Assignment";
    case "quiz":
      return "Quiz";
    case "discussion_topic":
      return "Discussion";
    case "wiki_page":
      return "Page";
    case "planner_note":
      return "Note";
    case "calendar_event":
      return "Event";
    case "announcement":
      return "Announcement";
    default:
      return type.replaceAll("_", " ");
  }
}
