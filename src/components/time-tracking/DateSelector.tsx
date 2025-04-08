
import { useState } from "react";
import { format, subDays, addDays, isSameDay, isAfter } from "date-fns";
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
  const today = new Date();
  const [visibleDates, setVisibleDates] = useState<Date[]>(
    Array.from({ length: 6 }, (_, i) => subDays(today, i))
  );

  const handlePreviousDates = () => {
    const lastDate = visibleDates[visibleDates.length - 1];
    setVisibleDates(
      Array.from({ length: 6 }, (_, i) => subDays(lastDate, i + 1))
    );
  };

  const handleNextDates = () => {
    const lastDate = visibleDates[visibleDates.length - 1];
    // Calculate the next set of dates
    const nextDates = Array.from({ length: 6 }, (_, i) => addDays(lastDate, 6 - i));
    
    // Only allow future dates up to today
    if (!isAfter(nextDates[0], today)) {
      setVisibleDates(nextDates);
    } else {
      // If we would exceed today, set to the last 6 days up to today
      setVisibleDates(
        Array.from({ length: 6 }, (_, i) => subDays(today, i))
      );
    }
  };

  const isDateSelected = (date: Date) => {
    return isSameDay(date, selectedDate);
  };

  // Check if we're showing the most recent dates
  const isShowingMostRecentDates = isSameDay(visibleDates[0], today);

  return (
    <div className="space-y-4">
      <div className="rounded-md overflow-hidden">
        <div className="bg-primary text-primary-foreground p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start p-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={() => onDateChange(today)}
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
              <span className="sr-only">Previous dates</span>
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
              disabled={isShowingMostRecentDates}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next dates</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
