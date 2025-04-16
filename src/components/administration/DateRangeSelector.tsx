import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

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
  // Create a two-stage selection in a single dialog
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [localFromDate, setLocalFromDate] = useState<Date | undefined>(fromDate);
  const [localToDate, setLocalToDate] = useState<Date | undefined>(toDate);

  useEffect(() => {
    setLocalFromDate(fromDate);
    setLocalToDate(toDate);
  }, [fromDate, toDate]);

  const handleFromDateSelect = (date: Date | undefined) => {
    // Prevent deselection - if date is undefined and we had a previous date, keep the previous date
    if (!date && localFromDate) {
      return;
    }
    
    setLocalFromDate(date);
    onDateChange(date, localToDate);
    setFromPickerOpen(false);
    
    // Automatically open To date picker if From date was selected and To date is not set
    if (date && !localToDate) {
      setTimeout(() => setToPickerOpen(true), 100);
    }
  };

  const handleToDateSelect = (date: Date | undefined) => {
    // Prevent deselection - if date is undefined and we had a previous date, keep the previous date
    if (!date && localToDate) {
      return;
    }
    
    setLocalToDate(date);
    onDateChange(localFromDate, date);
    setToPickerOpen(false);
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
              initialFocus
              className="pointer-events-auto"
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
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
