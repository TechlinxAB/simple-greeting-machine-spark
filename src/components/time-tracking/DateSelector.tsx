
import { useState } from "react";
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
  const [visibleDates, setVisibleDates] = useState<Date[]>(
    Array.from({ length: 6 }, (_, i) => subDays(today, i))
  );

  const handlePreviousDates = () => {
    // Move backward by 1 day
    const lastDate = visibleDates[visibleDates.length - 1];
    const prevDate = subDays(lastDate, 1);
    
    // Create a new array with the previous date added at the end
    // and remove the first (newest) date from the beginning
    const newDates = [...visibleDates.slice(1), prevDate];
    setVisibleDates(newDates);
  };

  const handleNextDates = () => {
    // Move forward by 1 day
    const firstDate = visibleDates[0];
    const nextDate = addDays(firstDate, 1);
    
    // Create a new array with the next date added at the beginning
    // and remove the last (oldest) date from the end
    const newDates = [nextDate, ...visibleDates.slice(0, -1)];
    setVisibleDates(newDates);
  };

  const goToToday = () => {
    // Set today as the selected date
    onDateChange(today);
    // Update visible dates to include today and previous 5 days
    setVisibleDates(
      Array.from({ length: 6 }, (_, i) => subDays(today, i))
    );
  };

  const isDateSelected = (date: Date) => {
    return isSameDay(date, selectedDate);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md overflow-hidden">
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
                isDateSelected(date) ? "bg-secondary text-secondary-foreground" : ""
              )}
              onClick={() => onDateChange(date)}
            >
              {format(date, "d MMM")}
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
