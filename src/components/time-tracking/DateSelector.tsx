
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { format, addDays, isSameDay, startOfWeek, addWeeks, endOfWeek, isToday, isWithinInterval } from "date-fns";

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(selectedDate);
  const [dateList, setDateList] = useState<Date[]>([]);
  
  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = addDays(selectedDate, -1);
    onDateChange(newDate);
  };
  
  // Navigate to next day
  const goToNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    onDateChange(newDate);
  };
  
  // Navigate to today
  const goToToday = () => {
    onDateChange(new Date());
  };
  
  // Update date list when selected date changes
  useEffect(() => {
    // Generate dates for the week, plus some days before and after
    const today = new Date();
    const dates = [];
    
    // Add today and 6 days after it
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(today, -i));
    }
    
    setDateList(dates);
    setCalendarDate(selectedDate);
  }, [selectedDate]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={goToPreviousDay}
          title="Previous Day"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous Day</span>
        </Button>
        
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-center items-center gap-2 px-3"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>
                {isToday(selectedDate) 
                  ? "Today" 
                  : format(selectedDate, "MMM dd, yyyy")}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={goToNextDay}
          title="Next Day"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next Day</span>
        </Button>
      </div>
      
      <div className="space-y-1">
        <Button
          variant={isToday(selectedDate) ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={goToToday}
        >
          Today
        </Button>
        
        {dateList.map((date, index) => (
          <Button
            key={index}
            variant={isSameDay(date, selectedDate) && !isToday(date) ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => onDateChange(date)}
          >
            {format(date, "EEE, MMM d")}
          </Button>
        ))}
      </div>
    </div>
  );
}
