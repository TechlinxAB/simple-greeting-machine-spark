
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { format, addDays, isSameDay, isToday, subDays, isBefore, isAfter } from "date-fns";

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateList, setDateList] = useState<Date[]>([]);
  
  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = subDays(selectedDate, 1);
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
    updateDateList(selectedDate);
  }, [selectedDate]);
  
  // Generate a list of dates centered around the selected date
  const updateDateList = (centerDate: Date) => {
    const today = new Date();
    const dates = [];
    
    // Add days before and after the selected date
    for (let i = -3; i <= 3; i++) {
      dates.push(addDays(centerDate, i));
    }
    
    // Sort dates: Future dates first (ascending), then today, then past dates (descending)
    dates.sort((a, b) => {
      // If both dates are in the future (compared to today)
      if (isAfter(a, today) && isAfter(b, today)) {
        return isBefore(a, b) ? -1 : 1; // Ascending order for future dates
      }
      
      // If both dates are in the past (compared to today)
      if (isBefore(a, today) && isBefore(b, today)) {
        return isBefore(a, b) ? 1 : -1; // Descending order for past dates
      }
      
      // If one is future and one is past
      if (isAfter(a, today) && isBefore(b, today)) {
        return -1; // Future dates before past dates
      }
      
      if (isBefore(a, today) && isAfter(b, today)) {
        return 1; // Future dates before past dates
      }
      
      // If one is today
      if (isToday(a)) return 0;
      if (isToday(b)) return 0;
      
      return 0;
    });

    // Move today to the top if it exists in the list
    const todayIndex = dates.findIndex(date => isToday(date));
    if (todayIndex !== -1) {
      const today = dates.splice(todayIndex, 1)[0];
      dates.unshift(today); // Add today to the beginning
    }
    
    setDateList(dates);
  };
  
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
                  : format(selectedDate, "d MMM yyyy")}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                  setCalendarOpen(false);
                  updateDateList(date); // Immediately update date list when selecting from calendar
                }
              }}
              initialFocus
              className="pointer-events-auto"
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
          className="w-full justify-start bg-green-500 hover:bg-green-600 text-white"
          onClick={goToToday}
        >
          Today
        </Button>
        
        {dateList.map((date, index) => (
          <Button
            key={index}
            variant={isSameDay(date, selectedDate) && !isToday(date) ? "default" : "ghost"}
            className={`w-full justify-start ${isSameDay(date, selectedDate) ? "bg-gray-100 text-gray-900" : ""}`}
            onClick={() => onDateChange(date)}
          >
            {format(date, "d MMM")}
          </Button>
        ))}
      </div>
    </div>
  );
}
