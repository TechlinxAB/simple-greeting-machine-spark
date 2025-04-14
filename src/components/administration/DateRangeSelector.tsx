
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<'from' | 'to'>('from');
  const [tempFromDate, setTempFromDate] = useState<Date | undefined>(fromDate);
  const [tempToDate, setTempToDate] = useState<Date | undefined>(toDate);

  // Reset temp dates when props change
  useEffect(() => {
    setTempFromDate(fromDate);
    setTempToDate(toDate);
  }, [fromDate, toDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (currentSelection === 'from') {
      setTempFromDate(date);
      setCurrentSelection('to');
    } else {
      setTempToDate(date);
      
      // Apply dates and close the picker
      onDateChange(tempFromDate, date);
      setDatePickerOpen(false);
      setCurrentSelection('from');
    }
  };

  const handleTriggerClick = () => {
    setDatePickerOpen(true);
    setCurrentSelection('from');
  };

  const handleOpenChange = (open: boolean) => {
    setDatePickerOpen(open);
    if (!open) {
      // Reset to initial state when closing without completing
      setCurrentSelection('from');
    }
  };

  const formatDateRange = () => {
    if (fromDate && toDate) {
      return `${format(fromDate, 'MMM dd, yyyy')} - ${format(toDate, 'MMM dd, yyyy')}`;
    }
    
    if (fromDate) {
      return `From: ${format(fromDate, 'MMM dd, yyyy')}`;
    }
    
    if (toDate) {
      return `To: ${format(toDate, 'MMM dd, yyyy')}`;
    }
    
    return "Select date range";
  };

  return (
    <Popover open={datePickerOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          onClick={handleTriggerClick}
          className={cn(
            "w-full justify-start text-left font-normal",
            "border border-input h-10",
            !fromDate && !toDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <div className="text-sm font-medium">
            {currentSelection === 'from' ? 'Select start date' : 'Select end date'}
          </div>
          {tempFromDate && currentSelection === 'to' && (
            <div className="text-xs text-muted-foreground mt-1">
              Start date: {format(tempFromDate, 'MMM dd, yyyy')}
            </div>
          )}
        </div>
        <Calendar
          mode="single"
          selected={currentSelection === 'from' ? tempFromDate : tempToDate}
          onSelect={handleDateSelect}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
