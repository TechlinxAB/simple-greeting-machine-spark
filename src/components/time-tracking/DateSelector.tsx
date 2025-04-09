
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
    
    // Generate dates - 3 days before and 3 days after the center date
    for (let i = -3; i <= 3; i++) {
      dates.push(addDays(centerDate, i));
    }
    
    // Separate upcoming and past dates
    const upcomingDates = dates.filter(date => 
      isAfter(date, today) || isSameDay(date, today)
    ).sort((a, b) => isBefore(a, b) ? -1 : 1); // Sort upcoming dates in ascending order
    
    const pastDates = dates.filter(date => 
      isBefore(date, today) && !isSameDay(date, today)
    ).sort((a, b) => isBefore(a, b) ? 1 : -1); // Sort past dates in descending order
    
    // Combine with today first (if present), then upcoming dates, then past dates
    const sortedDates = [];
    
    // Add today if it exists in the list
    const todayDate = dates.find(date => isToday(date));
    if (todayDate) {
      sortedDates.push(todayDate);
    }
    
    // Add upcoming dates (except today which is already added)
    upcomingDates.forEach(date => {
      if (!isToday(date)) {
        sortedDates.push(date);
      }
    });
    
    // Add past dates
    pastDates.forEach(date => {
      sortedDates.push(date);
    });
    
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
