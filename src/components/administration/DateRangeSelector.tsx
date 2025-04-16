import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface DateRangeSelectorProps {
  fromDate: Date | undefined;
  toDate: Date | undefined;
  onDateChange: (fromDate: Date | undefined, toDate: Date | undefined) => void;
}

export function DateRangeSelector({ 
  fromDate, 
  toDate, 
  onDateChange 
}: DateRangeSelectorProps) {
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [localFromDate, setLocalFromDate] = useState<Date | undefined>(fromDate);
  const [localToDate, setLocalToDate] = useState<Date | undefined>(toDate);
  const [fromMonth, setFromMonth] = useState<Date>(localFromDate || new Date());
  const [toMonth, setToMonth] = useState<Date>(localToDate || new Date());

  useEffect(() => {
    setLocalFromDate(fromDate);
    setLocalToDate(toDate);
    if (fromDate) setFromMonth(fromDate);
    if (toDate) setToMonth(toDate);
  }, [fromDate, toDate]);

  const handleFromDateSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }
    
    setLocalFromDate(date);
    onDateChange(date, localToDate);
    setFromPickerOpen(false);
    
    if (date && !localToDate) {
      setTimeout(() => setToPickerOpen(true), 100);
    }
  };

  const handleToDateSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }
    
    setLocalToDate(date);
    onDateChange(localFromDate, date);
    setToPickerOpen(false);
  };

  const handlePreviousMonth = (isFromDate: boolean) => {
    if (isFromDate) {
      setFromMonth(subMonths(fromMonth, 1));
    } else {
      setToMonth(subMonths(toMonth, 1));
    }
  };

  const handleNextMonth = (isFromDate: boolean) => {
    if (isFromDate) {
      setFromMonth(addMonths(fromMonth, 1));
    } else {
      setToMonth(addMonths(toMonth, 1));
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <div>
        <label className="text-sm font-medium block mb-2">From date</label>
        <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[150px] justify-start text-left font-normal",
                !localFromDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {localFromDate ? format(localFromDate, 'MMM dd, yyyy') : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={localFromDate}
              onSelect={handleFromDateSelect}
              month={fromMonth}
              onMonthChange={setFromMonth}
              initialFocus
              className="pointer-events-auto"
              classNames={{
                caption: "flex items-center justify-between p-2 border-b",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                  "h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100",
                  "rounded-full hover:bg-accent"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1"
              }}
              components={{
                Caption: ({ label }) => (
                  <div className="flex items-center justify-center">
                    <span>{label}</span>
                  </div>
                )
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="text-sm font-medium block mb-2">To date</label>
        <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[150px] justify-start text-left font-normal",
                !localToDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {localToDate ? format(localToDate, 'MMM dd, yyyy') : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={localToDate}
              onSelect={handleToDateSelect}
              month={toMonth}
              onMonthChange={setToMonth}
              initialFocus
              className="pointer-events-auto"
              classNames={{
                caption: "flex items-center justify-between p-2 border-b",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                  "h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100",
                  "rounded-full hover:bg-accent"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1"
              }}
              components={{
                Caption: ({ label }) => (
                  <div className="flex items-center justify-center">
                    <span>{label}</span>
                  </div>
                )
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
