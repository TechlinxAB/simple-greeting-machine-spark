
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const isMobile = useIsMobile();
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full max-w-[280px] mx-auto p-2 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-2 sm:space-x-2 sm:space-y-0",
        month: "space-y-2 w-full",
        caption: "flex justify-center pt-1 relative items-center", 
        caption_label: "text-[0.65rem] sm:text-xs font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-5 w-5 sm:h-6 sm:w-6 bg-transparent p-0 opacity-80 hover:opacity-100 hover:bg-accent hover:text-accent-foreground" 
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full justify-between mb-1",
        head_cell:
          "text-muted-foreground rounded-md w-6 sm:w-8 font-normal text-[0.6rem] sm:text-[0.7rem] uppercase",
        row: "flex w-full mt-1 justify-between",
        cell: "relative h-6 w-6 sm:h-8 sm:w-8 p-0 text-center text-[0.65rem] sm:text-xs focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-6 w-6 sm:h-8 sm:w-8 p-0 font-normal text-[0.65rem] sm:text-xs rounded-full hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
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
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
