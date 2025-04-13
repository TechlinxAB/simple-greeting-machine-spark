
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, addMonths, subMonths } from 'date-fns';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);

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

  // Custom styles for different day states - selected style will override today style
  const modifiersStyles = {
    // Selected day (clicked by user) - this will override the "today" style because of CSS specificity
    selected: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'white',
      fontWeight: 'bold',
      borderRadius: '100%',
    },
    // Today's date styling (when not selected)
    today: {
      backgroundColor: 'hsl(var(--primary)/0.2)',
      color: 'hsl(var(--primary))',
      fontWeight: 'bold',
      borderRadius: '100%',
    },
  };

  return (
    <Card className="border border-primary/20 shadow-md overflow-hidden w-full">
      <CardHeader className="pb-2 pt-4 px-4 border-b border-primary/20">
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <div className="flex items-center">
            {format(currentMonth, 'MMMM, yyyy')}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-accent"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-accent"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="w-full border-none"
            showOutsideDays={true}
            modifiersStyles={modifiersStyles}
            modifiers={{
              selected: (date) => selectedDate && date.getTime() === selectedDate.getTime(),
              today: (date) => isToday(date) && (!selectedDate || date.getTime() !== selectedDate.getTime())
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
