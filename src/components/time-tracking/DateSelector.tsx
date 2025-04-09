
import { useState, useEffect } from "react";
import { format, subDays, addDays, isSameDay, startOfToday } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const today = startOfToday();
  
  // Initialize visible dates with today and previous 5 days
  const [visibleDates, setVisibleDates] = useState<Date[]>(() => {
    // Start with today at the top and go backwards for 5 more days
    return [today, ...Array(5).fill(0).map((_, i) => subDays(today, i + 1))];
  });

  // Update visible dates when today changes (midnight)
  useEffect(() => {
    const currentToday = startOfToday();
    if (!isSameDay(currentToday, visibleDates[0])) {
      setVisibleDates([currentToday, ...Array(5).fill(0).map((_, i) => subDays(currentToday, i + 1))]);
    }
  }, [today]);

  const handlePreviousDates = () => {
    // Move backward by one day
    setVisibleDates(prevDates => {
      const lastDate = prevDates[prevDates.length - 1];
      const dayBefore = subDays(lastDate, 1);
      return [...prevDates.slice(1), dayBefore];
    });
  };

  const handleNextDates = () => {
    // Move forward by one day
    setVisibleDates(prevDates => {
      const firstDate = prevDates[0];
      const nextDay = addDays(firstDate, 1);
      return [nextDay, ...prevDates.slice(0, -1)];
    });
  };

  const goToToday = () => {
    // Set today as the selected date
    onDateChange(today);
    
    // Reset visible dates to today and previous 5 days
    setVisibleDates([today, ...Array(5).fill(0).map((_, i) => subDays(today, i + 1))]);
  };

  const isDateSelected = (date: Date) => {
    return isSameDay(date, selectedDate);
  };

  const isToday = (date: Date) => {
    return isSameDay(date, today);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md overflow-hidden border">
        <div className="bg-primary text-primary-foreground p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start p-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={goToToday}
          >
            Today
          </Button>
        </div>
        
        <div className="space-y-2 bg-background p-2">
          {visibleDates.map((date) => (
            <Button
              key={date.toISOString()}
              variant="ghost"
              className={cn(
                "w-full justify-start p-2",
                isDateSelected(date) ? "bg-secondary text-secondary-foreground" : "",
                isToday(date) && !isDateSelected(date) ? "text-primary font-medium" : ""
              )}
              onClick={() => onDateChange(date)}
            >
              {isToday(date) ? "Today" : format(date, "d MMM")}
            </Button>
          ))}
          
          <div className="flex justify-between pt-2">
            <Button 
              size="icon" 
              variant="outline" 
              onClick={handlePreviousDates}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous date</span>
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="text-primary hover:text-primary/90 hover:bg-primary/10"
                >
                  Choose a specific date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && onDateChange(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <Button 
              size="icon" 
              variant="outline" 
              onClick={handleNextDates}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next date</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
