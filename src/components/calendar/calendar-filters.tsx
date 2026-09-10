import type {
  CalendarSource,
  CalendarSwatch,
} from "@/components/calendar/shared";
import { calendarSwatch } from "@/components/calendar/shared";
import { Card, CardPanel } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Label } from "@/components/ui/label";

/**
 * Lets the user hide calendars without changing the Canvas fetch.
 * Colors match saved Canvas custom colors when they exist.
 */
export function CalendarFilters({
  sources,
  value,
  customColors,
  onValueChange,
}: {
  sources: CalendarSource[];
  value: string[];
  customColors: Record<string, string>;
  onValueChange: (codes: string[]) => void;
}) {
  if (sources.length === 0) return null;

  return (
    <Card className="w-full min-w-0">
      <CardPanel className="py-4">
        <CheckboxGroup
          aria-label="Calendars"
          value={value}
          onValueChange={onValueChange}
          className="flex flex-row flex-wrap gap-x-4 gap-y-2"
        >
          {sources.map((source) => (
            <Label
              key={source.code}
              className="min-w-0 max-w-64 cursor-pointer"
            >
              <Checkbox value={source.code} />
              <CalendarColorDot
                swatch={calendarSwatch(source.code, customColors)}
              />
              <span className="truncate">{source.label}</span>
            </Label>
          ))}
        </CheckboxGroup>
      </CardPanel>
    </Card>
  );
}

/** Small swatch used next to calendar names and agenda rows. */
export function CalendarColorDot({ swatch }: { swatch: CalendarSwatch }) {
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full border border-black/10 dark:border-white/15"
      style={{ backgroundColor: swatch.hex }}
    />
  );
}
