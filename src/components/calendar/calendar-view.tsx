import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CalendarColorDot,
  CalendarFilters,
} from "@/components/calendar/calendar-filters";
import {
  CalendarToolbar,
  type CalendarViewMode,
} from "@/components/calendar/calendar-toolbar";
import { MonthGrid } from "@/components/calendar/month-grid";
import {
  type CalendarItem,
  calendarContextCodes,
  calendarSources,
  calendarSwatch,
  filterItemsByContext,
  formatDayHeading,
  formatEventTime,
  formatMonthHeading,
  formatWeekHeading,
  groupItemsByDay,
  toDateKey,
  visibleGridRange,
  weekRange,
} from "@/components/calendar/shared";
import { WeekView } from "@/components/calendar/week-view";
import { DisconnectedState } from "@/components/courses/course-detail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCalendarColors } from "@/integrations/canvas/use-calendar-colors";
import { useCalendarEvents } from "@/integrations/canvas/use-calendar-events";

/**
 * Month or week calendar plus a day agenda. On large screens an opened event
 * stays beside the grid; on small screens it uses a sheet.
 */
export function CalendarView() {
  const dashboard = useCanvasStore((state) => state.dashboard);
  const hasHydrated = useCanvasStore((state) => state.hasHydrated);
  const isRestoring = useCanvasStore((state) => state.isRestoring);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [visibleCodes, setVisibleCodes] = useState<string[]>();
  const [view, setView] = useState<CalendarViewMode>("month");
  const isLarge = useMediaQuery("lg");
  const isCompactGrid = !useMediaQuery("md");
  const colorsQuery = useCalendarColors();
  const customColors = colorsQuery.data ?? {};

  const range =
    view === "week" ? weekRange(selectedDate) : visibleGridRange(month);
  const sources = useMemo(
    () =>
      dashboard
        ? calendarSources({
            userId: dashboard.profile.id,
            courses: dashboard.courses,
          })
        : [],
    [dashboard],
  );
  const contextCodes = useMemo(
    () =>
      dashboard
        ? calendarContextCodes({
            userId: dashboard.profile.id,
            courseIds: dashboard.courses.map((course) => course.id),
          })
        : [],
    [dashboard],
  );
  const allCodes = useMemo(
    () => sources.map((source) => source.code),
    [sources],
  );
  const activeCodes = visibleCodes ?? allCodes;
  const events = useCalendarEvents({
    startDate: range.startDate,
    endDate: range.endDate,
    contextCodes,
  });

  const visibleItems = useMemo(
    () => filterItemsByContext(events.data ?? [], new Set(activeCodes)),
    [events.data, activeCodes],
  );
  const itemsByDay = useMemo(
    () => groupItemsByDay(visibleItems),
    [visibleItems],
  );
  const selectedKey = toDateKey(selectedDate);
  const dayItems = itemsByDay.get(selectedKey) ?? [];
  const selectedEvent = visibleItems.find(
    (item) => item.id === selectedEventId,
  );

  if (!hasHydrated || isRestoring) return <CalendarSkeleton />;
  if (!dashboard) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading font-semibold text-3xl tracking-tight">
            Calendar
          </h1>
          <p className="text-muted-foreground text-sm">
            Connect to Canvas to see assignments and events on a local calendar.
          </p>
        </div>
        <DisconnectedState />
      </div>
    );
  }

  function selectDay(date: Date) {
    setSelectedDate(date);
    setSelectedEventId(undefined);
  }

  function syncMonth(date: Date) {
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function jumpToToday() {
    const today = new Date();
    syncMonth(today);
    selectDay(today);
  }

  function shift(delta: number) {
    if (view === "week") {
      const next = new Date(selectedDate);
      next.setDate(selectedDate.getDate() + delta * 7);
      selectDay(next);
      syncMonth(next);
      return;
    }
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading font-semibold text-3xl tracking-tight">
            Calendar
          </h1>
          <p className="text-muted-foreground text-sm">
            Assignments and events from your Canvas calendars for{" "}
            {view === "week"
              ? formatWeekHeading(selectedDate)
              : formatMonthHeading(month)}
            .
          </p>
        </div>
      </div>

      {events.error ? (
        <Alert variant="error">
          <AlertCircle />
          <AlertTitle>Couldn&rsquo;t load the calendar</AlertTitle>
          <AlertDescription>{events.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <CalendarFilters
        sources={sources}
        value={activeCodes}
        customColors={customColors}
        onValueChange={setVisibleCodes}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <div className="flex min-w-0 flex-col gap-3">
          <CalendarToolbar
            heading={
              view === "week"
                ? formatWeekHeading(selectedDate)
                : formatMonthHeading(month)
            }
            view={view}
            prevLabel={view === "week" ? "Previous week" : "Previous month"}
            nextLabel={view === "week" ? "Next week" : "Next month"}
            onViewChange={setView}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
            onToday={jumpToToday}
          />
          {view === "week" ? (
            <WeekView
              selectedDate={selectedDate}
              selectedEventId={selectedEventId}
              itemsByDay={itemsByDay}
              customColors={customColors}
              onSelectDay={selectDay}
              onSelectEvent={(date, item) => {
                setSelectedDate(date);
                setSelectedEventId(item.id);
              }}
            />
          ) : (
            <MonthGrid
              month={month}
              selectedDate={selectedDate}
              selectedEventId={selectedEventId}
              itemsByDay={itemsByDay}
              customColors={customColors}
              compact={isCompactGrid}
              onSelectDay={selectDay}
              onSelectEvent={(date, item) => {
                setSelectedDate(date);
                setSelectedEventId(item.id);
              }}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {selectedEvent && isLarge ? (
            <EventDetailCard
              item={selectedEvent}
              origin={dashboard.origin}
              onBack={() => setSelectedEventId(undefined)}
            />
          ) : null}
          <DayAgendaCard
            date={selectedDate}
            items={dayItems}
            isLoading={events.isPending}
            selectedEventId={selectedEventId}
            customColors={customColors}
            onSelectEvent={setSelectedEventId}
          />
        </div>
      </div>

      <Sheet
        open={Boolean(selectedEvent) && !isLarge}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(undefined);
        }}
      >
        {selectedEvent ? (
          <SheetPopup>
            <SheetHeader>
              <SheetTitle>{selectedEvent.title}</SheetTitle>
              <SheetDescription>
                {formatEventTime(selectedEvent)}
                {selectedEvent.context_name
                  ? ` · ${selectedEvent.context_name}`
                  : ""}
              </SheetDescription>
            </SheetHeader>
            <SheetPanel>
              <EventMeta item={selectedEvent} />
            </SheetPanel>
            <SheetFooter>
              <CanvasLinkButton
                item={selectedEvent}
                origin={dashboard.origin}
              />
            </SheetFooter>
          </SheetPopup>
        ) : null}
      </Sheet>
    </div>
  );
}

function DayAgendaCard({
  date,
  items,
  isLoading,
  selectedEventId,
  customColors,
  onSelectEvent,
}: {
  date: Date;
  items: CalendarItem[];
  isLoading: boolean;
  selectedEventId?: string;
  customColors: Record<string, string>;
  onSelectEvent: (id: string) => void;
}) {
  return (
    <Card className="min-w-0 lg:sticky lg:top-4">
      <CardHeader className="border-b">
        <CardTitle>{formatDayHeading(date)}</CardTitle>
        <CardDescription>
          {isLoading
            ? "Loading this day"
            : items.length === 1
              ? "1 item"
              : `${items.length} items`}
        </CardDescription>
      </CardHeader>
      <CardPanel className="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : items.length ? (
          <ul className="divide-y">
            {items.map((item) => {
              const selected = item.id === selectedEventId;
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(item.id)}
                    className="flex w-full items-start gap-3 px-6 py-3.5 text-start outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 data-selected:bg-accent/70"
                    data-selected={selected ? "true" : undefined}
                  >
                    <CalendarColorDot
                      swatch={calendarSwatch(item.context_code, customColors)}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate font-medium text-sm">
                        {item.title}
                      </span>
                      <span className="truncate text-muted-foreground text-xs">
                        {item.context_name ?? "Canvas"} ·{" "}
                        {formatEventTime(item)}
                      </span>
                    </span>
                    <EventKindBadge kind={item.kind} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty className="py-12 md:py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>Nothing on this day</EmptyTitle>
              <EmptyDescription>
                Canvas has no events or due dates for the selected day.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardPanel>
    </Card>
  );
}

function EventDetailCard({
  item,
  origin,
  onBack,
}: {
  item: CalendarItem;
  origin: string;
  onBack: () => void;
}) {
  return (
    <Card className="min-w-0 lg:sticky lg:top-4">
      <CardHeader className="border-b">
        <CardTitle>{item.title}</CardTitle>
        <CardDescription>{formatEventTime(item)}</CardDescription>
        <CardAction>
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <X />
          </Button>
        </CardAction>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">
        <EventMeta item={item} />
        <CanvasLinkButton item={item} origin={origin} />
      </CardPanel>
    </Card>
  );
}

function EventMeta({ item }: { item: CalendarItem }) {
  return (
    <dl className="grid gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <dt className="sr-only">Type</dt>
        <dd>
          <EventKindBadge kind={item.kind} />
        </dd>
      </div>
      <MetaRow
        label="Calendar"
        value={item.context_name ?? "Personal calendar"}
      />
      {item.location_name ? (
        <MetaRow label="Location" value={item.location_name} />
      ) : null}
      {item.kind === "assignment" && item.points_possible != null ? (
        <MetaRow label="Points" value={String(item.points_possible)} />
      ) : null}
    </dl>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function EventKindBadge({ kind }: { kind: CalendarItem["kind"] }) {
  return (
    <Badge variant={kind === "assignment" ? "info" : "secondary"} size="sm">
      {kind === "assignment" ? "Assignment" : "Event"}
    </Badge>
  );
}

function CanvasLinkButton({
  item,
  origin,
}: {
  item: CalendarItem;
  origin: string;
}) {
  const href = item.html_url ?? origin;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={buttonVariants()}
    >
      <ExternalLink />
      Open in Canvas
    </a>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardPanel>
          <Skeleton className="h-72 w-full" />
        </CardPanel>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </CardPanel>
      </Card>
    </div>
  );
}
