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
    updateDateList();
  }, [selectedDate]);
  
  // Generate a list of dates - always showing 7 dates including and around the selected date
  const updateDateList = () => {
    const today = new Date();
    const totalDates = 7; // Always show 7 dates
    
    // Generate date range
    let dates: Date[] = [];
    
    // Always include selected date, today, and dates around them
    dates.push(selectedDate);
    if (!isSameDay(today, selectedDate)) {
      dates.push(today);
    }
    
    // Add 3 days before and 3 days after selected date
    for (let i = 1; i <= 3; i++) {
      dates.push(subDays(selectedDate, i));
      dates.push(addDays(selectedDate, i));
    }
    
    // Remove duplicates
    dates = Array.from(new Set(dates.map(d => d.getTime())))
      .map(time => new Date(time));
    
    // Sort dates temporarily to pick a consistent set
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    // If we have more than the desired number of dates, trim the list
    if (dates.length > totalDates) {
      // Calculate center index - prioritize keeping dates around selected date
      const selectedIndex = dates.findIndex(d => isSameDay(d, selectedDate));
      const startIndex = Math.max(0, selectedIndex - Math.floor(totalDates / 2));
      const endIndex = Math.min(dates.length, startIndex + totalDates);
      
      // Adjust startIndex if we're at the end of the array
      const adjustedStartIndex = endIndex === dates.length 
        ? Math.max(0, dates.length - totalDates) 
        : startIndex;
        
      dates = dates.slice(adjustedStartIndex, adjustedStartIndex + totalDates);
    }
    
    // Now sort for display with custom order:
    // 1. Today first (if present)
    // 2. Future dates in ascending order
    // 3. Past dates in descending order
    const sortedDates: Date[] = [];
    
    // 1. Add today if it exists in the dates
    const todayDate = dates.find(date => isToday(date));
    if (todayDate) {
      sortedDates.push(todayDate);
    }
    
    // 2. Add future dates in ascending order (excluding today)
    const futureDates = dates
      .filter(date => isAfter(date, today) && !isSameDay(date, today))
      .sort((a, b) => a.getTime() - b.getTime());
      
    sortedDates.push(...futureDates);
    
    // 3. Add past dates in descending order (excluding today)
    const pastDates = dates
      .filter(date => isBefore(date, today) && !isSameDay(date, today))
      .sort((a, b) => b.getTime() - a.getTime());
      
    sortedDates.push(...pastDates);
    
    setDateList(sortedDates);
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
            className={`w-full justify-start ${isSameDay(date, selectedDate) && !isToday(date) ? "bg-gray-100 text-gray-900" : ""}`}
            onClick={() => onDateChange(date)}
          >
            {format(date, "d MMM")}
          </Button>
        ))}
      </div>
    </div>
  );
}
