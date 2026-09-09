import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MonthGrid } from "@/components/calendar/month-grid";
import {
  type CalendarItem,
  calendarContextCodes,
  formatDayHeading,
  formatEventTime,
  formatMonthHeading,
  groupItemsByDay,
  toDateKey,
  visibleGridRange,
} from "@/components/calendar/shared";
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
import { useCalendarEvents } from "@/integrations/canvas/use-calendar-events";

/**
 * Month calendar plus a day agenda. On large screens an opened event stays
 * beside the month; on small screens it uses a sheet.
 */
export function CalendarView() {
  const dashboard = useCanvasStore((state) => state.dashboard);
  const hasHydrated = useCanvasStore((state) => state.hasHydrated);
  const isRestoring = useCanvasStore((state) => state.isRestoring);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const isLarge = useMediaQuery("lg");
  const isWide = useMediaQuery("xl");
  const isCompactGrid = !useMediaQuery("md");

  const range = visibleGridRange(month);
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
  const events = useCalendarEvents({
    startDate: range.startDate,
    endDate: range.endDate,
    contextCodes,
  });

  const itemsByDay = useMemo(
    () => groupItemsByDay(events.data ?? []),
    [events.data],
  );
  const selectedKey = toDateKey(selectedDate);
  const dayItems = itemsByDay.get(selectedKey) ?? [];
  const selectedEvent = (events.data ?? []).find(
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
            Connect to Canvas to see assignments and events on a local month
            view.
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

  function jumpToToday() {
    const today = new Date();
    setMonth(today);
    selectDay(today);
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
            {formatMonthHeading(month)}.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={jumpToToday}>
          Today
        </Button>
      </div>

      {events.error ? (
        <Alert variant="error">
          <AlertCircle />
          <AlertTitle>Couldn&rsquo;t load this month</AlertTitle>
          <AlertDescription>{events.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div
        className={
          selectedEvent && isWide
            ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,20rem)_minmax(20rem,24rem)]"
            : "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"
        }
      >
        <Card className="min-w-0">
          <CardHeader className="border-b">
            <CardTitle>Month</CardTitle>
            <CardDescription>
              {events.isPending
                ? "Loading events"
                : `${events.data?.length ?? 0} items in this view`}
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <MonthGrid
              month={month}
              selectedDate={selectedDate}
              selectedEventId={selectedEventId}
              itemsByDay={itemsByDay}
              compact={isCompactGrid}
              onMonthChange={setMonth}
              onSelectDay={selectDay}
              onSelectEvent={(date, item) => {
                setSelectedDate(date);
                setSelectedEventId(item.id);
              }}
            />
          </CardPanel>
        </Card>

        {selectedEvent && isWide ? (
          <>
            <DayAgendaCard
              date={selectedDate}
              items={dayItems}
              isLoading={events.isPending}
              selectedEventId={selectedEvent.id}
              onSelectEvent={setSelectedEventId}
            />
            <EventDetailCard
              item={selectedEvent}
              origin={dashboard.origin}
              onBack={() => setSelectedEventId(undefined)}
            />
          </>
        ) : selectedEvent && isLarge ? (
          <EventDetailCard
            item={selectedEvent}
            origin={dashboard.origin}
            onBack={() => setSelectedEventId(undefined)}
          />
        ) : (
          <DayAgendaCard
            date={selectedDate}
            items={dayItems}
            isLoading={events.isPending}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />
        )}
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
  onSelectEvent,
}: {
  date: Date;
  items: CalendarItem[];
  isLoading: boolean;
  selectedEventId?: string;
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
            <ChevronLeft />
            Back
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
