
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, isToday, isYesterday, isTomorrow, isThisWeek, isThisMonth, subDays, addDays } from 'date-fns';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setCalendarOpen(false);
    }
  };

  const getDateLabel = () => {
    if (isToday(selectedDate)) return 'Today';
    if (isYesterday(selectedDate)) return 'Yesterday';
    if (isTomorrow(selectedDate)) return 'Tomorrow';
    if (isThisWeek(selectedDate)) return format(selectedDate, 'EEEE');
    if (isThisMonth(selectedDate)) return format(selectedDate, 'EEEE, do');
    return format(selectedDate, 'MMMM d, yyyy');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Date</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePreviousDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-0">
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal mb-3"
          onClick={() => setCalendarOpen(!calendarOpen)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{getDateLabel()}</span>
        </Button>
        
        {calendarOpen && (
          <div className="border rounded-md overflow-hidden mt-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDate}
              className="mx-auto"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
