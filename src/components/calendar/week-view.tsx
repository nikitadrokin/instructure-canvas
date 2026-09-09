import {
  type CalendarItem,
  calendarSwatch,
  formatEventTime,
  formatHourLabel,
  isSameDay,
  isUntimedItem,
  timedEventLayout,
  toDateKey,
  weekDays,
  weekdayLabels,
} from "@/components/calendar/shared";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const hourStarts = Array.from({ length: 14 }, (_, index) => 7 + index);

/**
 * Seven-day week with an all-day row and a 7:00–21:00 timed grid.
 * Narrow screens scroll horizontally so day columns stay readable.
 */
export function WeekView({
  selectedDate,
  selectedEventId,
  itemsByDay,
  customColors,
  onSelectDay,
  onSelectEvent,
}: {
  selectedDate: Date;
  selectedEventId?: string;
  itemsByDay: Map<string, CalendarItem[]>;
  customColors: Record<string, string>;
  onSelectDay: (date: Date) => void;
  onSelectEvent: (date: Date, item: CalendarItem) => void;
}) {
  const days = weekDays(selectedDate);
  const labels = weekdayLabels();
  const today = new Date();

  return (
    <ScrollArea className="h-[min(42rem,70vh)]">
      <div className="min-w-[52rem]">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
          <div aria-hidden />
          {days.map((date, index) => {
            const selected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const weekday = labels[index] ?? "";
            return (
              <div
                key={toDateKey(date)}
                className="flex flex-col items-center gap-1 pb-2"
              >
                <span className="font-medium text-muted-foreground text-xs">
                  {weekday}
                </span>
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
                    isToday &&
                      !selected &&
                      "text-primary underline decoration-primary underline-offset-4",
                  )}
                  onClick={() => onSelectDay(date)}
                >
                  {date.getDate()}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
          <div className="px-1 py-2 text-muted-foreground text-xs">All day</div>
          {days.map((date) => {
            const key = toDateKey(date);
            const allDayItems = (itemsByDay.get(key) ?? []).filter(
              isUntimedItem,
            );
            return (
              <div
                key={`all-day-${key}`}
                className="flex min-h-10 min-w-0 flex-col gap-0.5 border-l p-1"
              >
                {allDayItems.map((item) => (
                  <WeekEventChip
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    date={date}
                    selected={item.id === selectedEventId}
                    customColors={customColors}
                    onSelectEvent={onSelectEvent}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div className="relative h-[42rem]">
            {hourStarts.map((hour, index) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t text-[0.65rem] text-muted-foreground"
                style={{ top: `${(index / hourStarts.length) * 100}%` }}
              >
                <span className="absolute -top-2 right-1">
                  {formatHourLabel(hour)}
                </span>
              </div>
            ))}
          </div>
          {days.map((date) => {
            const key = toDateKey(date);
            const timedItems = (itemsByDay.get(key) ?? []).filter(
              (item) => !isUntimedItem(item),
            );
            return (
              <div key={`timed-${key}`} className="relative h-[42rem] border-l">
                {hourStarts.map((hour, index) => (
                  <div
                    key={`${key}-${hour}`}
                    className="absolute inset-x-0 border-t border-border/70"
                    style={{ top: `${(index / hourStarts.length) * 100}%` }}
                  />
                ))}
                {timedItems.map((item) => {
                  const layout = timedEventLayout(item, date);
                  if (!layout) return null;
                  const swatch = calendarSwatch(
                    item.context_code,
                    customColors,
                  );
                  const selected = item.id === selectedEventId;
                  return (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      className="absolute inset-x-0.5 overflow-hidden rounded-md px-1 py-0.5 text-start outline-none ring-ring focus-visible:ring-2"
                      style={{
                        top: `${layout.top}%`,
                        height: `${layout.height}%`,
                        backgroundColor: swatch.hex,
                        color: swatch.foreground,
                        boxShadow: selected
                          ? "inset 0 0 0 2px var(--color-ring)"
                          : undefined,
                      }}
                      onClick={() => onSelectEvent(date, item)}
                    >
                      <span className="block truncate text-[0.65rem] font-medium leading-tight">
                        {item.title}
                      </span>
                      <span className="block truncate text-[0.6rem] opacity-80">
                        {formatEventTime(item)}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

function WeekEventChip({
  item,
  date,
  selected,
  customColors,
  onSelectEvent,
}: {
  item: CalendarItem;
  date: Date;
  selected: boolean;
  customColors: Record<string, string>;
  onSelectEvent: (date: Date, item: CalendarItem) => void;
}) {
  const swatch = calendarSwatch(item.context_code, customColors);
  return (
    <button
      type="button"
      className="w-full min-w-0 truncate rounded-sm px-1 py-0.5 text-start text-[0.65rem] font-medium outline-none ring-ring focus-visible:ring-2"
      style={{
        backgroundColor: swatch.hex,
        color: swatch.foreground,
        boxShadow: selected ? "inset 0 0 0 2px var(--color-ring)" : undefined,
      }}
      onClick={() => onSelectEvent(date, item)}
    >
      {item.title}
    </button>
  );
}
