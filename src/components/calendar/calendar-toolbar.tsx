import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import {
  segmentedControlItemVariants,
  segmentedControlRootClassName,
} from "@/lib/segmented-control";
import { cn } from "@/lib/utils";

/** Month grid or seven-day week. One value is always selected. */
export type CalendarViewMode = "month" | "week";

/**
 * Shared month/week chrome: prev/next, Today, and a segmented radio group.
 * Radio Group is required so a view cannot be cleared the way Toggle Group can.
 */
export function CalendarToolbar({
  heading,
  view,
  prevLabel,
  nextLabel,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: {
  heading: string;
  view: CalendarViewMode;
  prevLabel: string;
  nextLabel: string;
  onViewChange: (view: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const itemClassName = segmentedControlItemVariants({
    size: "sm",
    state: "checked",
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={prevLabel}
          onClick={onPrev}
        >
          <ChevronLeft />
        </Button>
        <h2 className="min-w-36 text-center font-heading font-semibold text-lg">
          {heading}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={nextLabel}
          onClick={onNext}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RadioGroup
          aria-label="Calendar view"
          value={view}
          onValueChange={(value) => {
            if (value === "month" || value === "week") onViewChange(value);
          }}
          className={cn(segmentedControlRootClassName, "flex-row")}
        >
          <RadioPrimitive.Root className={itemClassName} value="month">
            Month
          </RadioPrimitive.Root>
          <RadioPrimitive.Root className={itemClassName} value="week">
            Week
          </RadioPrimitive.Root>
        </RadioGroup>
        <Button type="button" variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
      </div>
    </div>
  );
}
