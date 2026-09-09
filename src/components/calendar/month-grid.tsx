import {
  type CalendarItem,
  calendarSwatch,
  isSameDay,
  isSameMonth,
  monthGridDays,
  toDateKey,
  weekdayLabels,
} from "@/components/calendar/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Full-page month grid. Compact screens show a count; larger screens show
 * event titles in each day so the calendar stays readable while a detail
 * panel is open.
 */
export function MonthGrid({
  month,
  selectedDate,
  selectedEventId,
  itemsByDay,
  customColors,
  compact,
  onSelectDay,
  onSelectEvent,
}: {
  month: Date;
  selectedDate: Date;
  selectedEventId?: string;
  itemsByDay: Map<string, CalendarItem[]>;
  customColors: Record<string, string>;
  compact: boolean;
  onSelectDay: (date: Date) => void;
  onSelectEvent: (date: Date, item: CalendarItem) => void;
}) {
  const days = monthGridDays(month);
  const labels = weekdayLabels();
  const today = new Date();
  const previewLimit = compact ? 0 : 3;

  return (
    <div className="grid min-w-0 grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
      {labels.map((label) => (
        <div
          key={label}
          className="bg-muted/80 px-1 py-2 text-center font-medium text-muted-foreground text-xs"
        >
          {label}
        </div>
      ))}
      {days.map((date) => {
        const key = toDateKey(date);
        const items = itemsByDay.get(key) ?? [];
        const inMonth = isSameMonth(date, month);
        const selected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, today);
        const hiddenCount = Math.max(0, items.length - previewLimit);

        return (
          <div
            key={key}
            className={cn(
              "flex min-h-14 min-w-0 flex-col gap-1 overflow-hidden bg-card p-1 sm:min-h-16 lg:min-h-28",
              !inMonth && "bg-muted/40",
              selected && "ring-2 ring-ring ring-inset",
            )}
          >
            <Button
              type="button"
              variant={selected ? "default" : "ghost"}
              size="icon-xs"
              aria-label={date.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              aria-pressed={selected}
              className={cn(
                "self-end sm:self-start",
                isToday &&
                  !selected &&
                  "text-primary underline decoration-primary underline-offset-4",
                !inMonth && "text-muted-foreground",
              )}
              onClick={() => onSelectDay(date)}
            >
              {date.getDate()}
            </Button>

            {compact ? (
              items.length > 0 ? (
                <span className="mx-auto flex items-center justify-center gap-0.5">
                  {items.slice(0, 3).map((item) => {
                    const swatch = calendarSwatch(
                      item.context_code,
                      customColors,
                    );
                    return (
                      <span
                        key={`${item.kind}-${item.id}`}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: swatch.hex }}
                      />
                    );
                  })}
                  <span className="sr-only">
                    {items.length === 1 ? "1 item" : `${items.length} items`}
                  </span>
                </span>
              ) : null
            ) : (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
                {items.slice(0, previewLimit).map((item) => {
                  const swatch = calendarSwatch(
                    item.context_code,
                    customColors,
                  );
                  const selected = item.id === selectedEventId;
                  return (
                    <Badge
                      key={`${item.kind}-${item.id}`}
                      size="sm"
                      variant="secondary"
                      className="w-full min-w-0 justify-start truncate border-transparent px-1 hover:opacity-90"
                      style={{
                        backgroundColor: swatch.hex,
                        color: swatch.foreground,
                        boxShadow: selected
                          ? "inset 0 0 0 2px var(--color-ring)"
                          : undefined,
                      }}
                      render={<button type="button" />}
                      onClick={() => onSelectEvent(date, item)}
                    >
                      {item.title}
                    </Badge>
                  );
                })}
                {hiddenCount > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-5 justify-start px-1 text-muted-foreground"
                    onClick={() => onSelectDay(date)}
                  >
                    +{hiddenCount} more
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
