
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useIsMobile, useIsSmallScreen } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const isSmallScreen = useIsSmallScreen();

  useEffect(() => {
    setLocalFromDate(fromDate);
    setLocalToDate(toDate);
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

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      <div>
        <label className="text-xs sm:text-sm font-medium block mb-1 sm:mb-2">From date</label>
        <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className={cn(
                "w-[120px] sm:w-[150px] justify-start text-left font-normal text-xs sm:text-sm",
                !localFromDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {localFromDate ? format(localFromDate, 'MMM dd, yyyy') : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={localFromDate}
              onSelect={handleFromDateSelect}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="text-xs sm:text-sm font-medium block mb-1 sm:mb-2">To date</label>
        <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className={cn(
                "w-[120px] sm:w-[150px] justify-start text-left font-normal text-xs sm:text-sm",
                !localToDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {localToDate ? format(localToDate, 'MMM dd, yyyy') : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={localToDate}
              onSelect={handleToDateSelect}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
