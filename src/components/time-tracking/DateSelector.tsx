
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, addMonths, subMonths } from 'date-fns';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isCompact?: boolean;
}

export function DateSelector({ selectedDate, onDateChange, isCompact = false }: DateSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);
  const [forceRender, setForceRender] = useState(0);
  
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
    <Card className={`border border-primary/20 shadow-md overflow-hidden w-full ${isCompact ? 'max-h-[290px]' : ''}`}>
      <CardHeader className={`${isCompact ? 'pb-1 pt-2 px-3' : 'pb-2 pt-4 px-4'} border-b border-primary/20`}>
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <div className="flex items-center">
            {format(currentMonth, 'MMMM, yyyy')}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`${isCompact ? 'h-6 w-6' : 'h-7 w-7'} rounded-full hover:bg-accent`}
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`${isCompact ? 'h-6 w-6' : 'h-7 w-7'} rounded-full hover:bg-accent`}
              onClick={handleNextMonth}
            >
              <ChevronRight className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`flex justify-center ${isCompact ? 'scale-[0.95] origin-top' : ''}`}>
          <Calendar
            key={renderKey} 
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="w-full border-none"
            showOutsideDays={true}
            hideHead={false}
            hideCaptionLabel={true}
            hideNav={true}
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
