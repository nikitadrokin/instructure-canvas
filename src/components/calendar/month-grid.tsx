import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type CalendarItem,
  formatMonthHeading,
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
  compact,
  onMonthChange,
  onSelectDay,
  onSelectEvent,
}: {
  month: Date;
  selectedDate: Date;
  selectedEventId?: string;
  itemsByDay: Map<string, CalendarItem[]>;
  compact: boolean;
  onMonthChange: (month: Date) => void;
  onSelectDay: (date: Date) => void;
  onSelectEvent: (date: Date, item: CalendarItem) => void;
}) {
  const days = monthGridDays(month);
  const labels = weekdayLabels();
  const today = new Date();
  const previewLimit = compact ? 0 : 3;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() =>
            onMonthChange(
              new Date(month.getFullYear(), month.getMonth() - 1, 1),
            )
          }
        >
          <ChevronLeft />
        </Button>
        <h2 className="font-heading font-semibold text-lg">
          {formatMonthHeading(month)}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={() =>
            onMonthChange(
              new Date(month.getFullYear(), month.getMonth() + 1, 1),
            )
          }
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
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
                "flex min-h-14 flex-col gap-1 bg-card p-1 sm:min-h-16 lg:min-h-28",
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
                  <span className="mx-auto size-1.5 rounded-full bg-primary">
                    <span className="sr-only">
                      {items.length === 1 ? "1 item" : `${items.length} items`}
                    </span>
                  </span>
                ) : null
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-0.5">
                  {items.slice(0, previewLimit).map((item) => (
                    <Badge
                      key={`${item.kind}-${item.id}`}
                      size="sm"
                      variant={
                        item.id === selectedEventId
                          ? "default"
                          : item.kind === "assignment"
                            ? "info"
                            : "secondary"
                      }
                      className="max-w-full justify-start truncate px-1"
                      render={<button type="button" />}
                      onClick={() => onSelectEvent(date, item)}
                    >
                      {item.title}
                    </Badge>
                  ))}
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
    </div>
  );
}
