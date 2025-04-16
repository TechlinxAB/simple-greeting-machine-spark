
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, addMonths, subMonths } from 'date-fns';
import { useIsMobile, useIsSmallScreen } from '@/hooks/use-mobile';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);
  const [forceRender, setForceRender] = useState(0);
  const isMobile = useIsMobile();
  const isSmallScreen = useIsSmallScreen();
  
  useEffect(() => {
    // Force multiple re-renders to ensure the calendar updates correctly
    const timer1 = setTimeout(() => setForceRender(prev => prev + 1), 10);
    const timer2 = setTimeout(() => setForceRender(prev => prev + 1), 50);
    const timer3 = setTimeout(() => setForceRender(prev => prev + 1), 100);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);
  
  // Reset month when selected date changes
  useEffect(() => {
    setCurrentMonth(selectedDate);
  }, [selectedDate]);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
    }
  };

  // Ensure rendering key is always unique for each re-render cycle
  const renderKey = `calendar-${forceRender}-${selectedDate.getTime()}`;

  return (
    <Card className="border border-primary/20 shadow-md overflow-hidden w-full">
      <CardHeader className="pb-1 pt-2 px-1 sm:px-3 border-b border-primary/20">
        <CardTitle className="flex items-center justify-between text-xs sm:text-sm font-medium">
          <div className="flex items-center">
            {format(currentMonth, 'MMMM, yyyy')}
          </div>
          <div className="flex gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-full hover:bg-accent"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-full hover:bg-accent"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex justify-center transform-none">
          <Calendar
            key={renderKey} 
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="w-full border-none"
            showOutsideDays={true}
            modifiers={{
              selected: (date) => date.toDateString() === selectedDate.toDateString(),
              today: (date) => isToday(date) && date.toDateString() !== selectedDate.toDateString()
            }}
            modifiersClassNames={{
              selected: 'bg-primary text-primary-foreground',
              today: 'bg-primary/20 text-primary'
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
