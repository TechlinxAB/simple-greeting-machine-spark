
import { useState } from "react";
import { format, subDays, isSameDay } from "date-fns";
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
    Array.from({ length: 6 }, (_, i) => subDays(today, i + 1))
  );

  const handlePreviousDates = () => {
    const lastDate = visibleDates[visibleDates.length - 1];
    setVisibleDates(
      Array.from({ length: 6 }, (_, i) => subDays(lastDate, i + 1))
    );
  };

  const handleNextDates = () => {
    const firstDate = visibleDates[0];
    // Don't allow going beyond today
    if (isSameDay(firstDate, today)) return;
    
    // Calculate how many days we need to move forward
    const daysToMove = Math.min(
      6,
      Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    
    if (daysToMove <= 0) return;
    
    setVisibleDates(
      Array.from({ length: 6 }, (_, i) => 
        i < daysToMove ? subDays(today, i + 1 - daysToMove) : visibleDates[i - daysToMove]
      )
    );
  };

  const isDateSelected = (date: Date) => {
    return isSameDay(date, selectedDate);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md overflow-hidden">
        <div className="bg-green-500 text-white p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start p-2 text-white hover:bg-green-600 hover:text-white"
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
                isDateSelected(date) ? "bg-green-100 text-green-800" : ""
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
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
              disabled={visibleDates[0] && isSameDay(visibleDates[0], subDays(today, 1))}
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
