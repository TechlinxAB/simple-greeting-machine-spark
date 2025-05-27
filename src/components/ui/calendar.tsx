
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  hideHead?: boolean;
  hideCaptionLabel?: boolean;
  hideNav?: boolean;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  hideHead = false,
  hideCaptionLabel = false,
  hideNav = false,
  ...props
}: CalendarProps) {

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full max-w-xs mx-auto p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: cn(
          "flex justify-center pt-1 relative items-center",
          hideCaptionLabel && "invisible h-0 pt-0 mb-0 overflow-hidden"
        ),
        caption_label: cn(
          "font-medium", 
          "text-xs sm:text-sm",
          hideCaptionLabel && "hidden"
        ),
        nav: cn(
          "space-x-1 flex items-center", 
          hideNav && "hidden"
        ),
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "bg-transparent p-0 opacity-80 hover:opacity-100 hover:bg-accent hover:text-accent-foreground cursor-pointer",
          "h-6 w-6 sm:h-7 sm:w-7",
          hideNav && "hidden"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: cn(
          "flex w-full justify-between mb-2",
          hideHead && "hidden"
        ),
        head_cell: cn(
          "text-muted-foreground rounded-md font-normal uppercase",
          "w-7 text-[0.7rem] sm:w-9 sm:text-[0.8rem]",
          hideHead && "hidden"
        ),
        row: "flex w-full mt-2 justify-between",
        cell: cn(
          "relative p-0 text-center focus-within:relative focus-within:z-20 cursor-pointer",
          "h-7 w-7 sm:h-9 sm:w-9",
          "text-xs sm:text-sm"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "p-0 font-normal rounded-full hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground cursor-pointer",
          "h-7 w-7 sm:h-9 sm:w-9",
          "text-xs sm:text-sm"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full !important",
        day_today: "bg-primary/20 text-primary border-none rounded-full font-semibold", 
        day_outside:
          "day-outside text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
