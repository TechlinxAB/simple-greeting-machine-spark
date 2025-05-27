
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, addMonths, subMonths } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isCompact?: boolean;
}

export function DateSelector({ selectedDate, onDateChange, isCompact = false }: DateSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);
  const [forceRender, setForceRender] = useState(0);
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const locale = language === 'sv' ? sv : undefined;
  
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
  const renderKey = `calendar-${forceRender}-${selectedDate.getTime()}-${language}`;

  return (
    <Card className="border border-primary/20 shadow-md overflow-hidden w-full">
      <CardHeader className="pb-2 pt-4 px-4 border-b border-primary/20">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center cursor-default text-xs sm:text-sm">
            {format(currentMonth, 'MMMM, yyyy', { locale })}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-accent cursor-pointer"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-accent cursor-pointer"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex justify-center">
          <Calendar
            key={renderKey} 
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="w-full border-none pointer-events-auto"
            showOutsideDays={true}
            hideHead={false}
            hideCaptionLabel={true}
            hideNav={true}
            locale={locale}
            modifiers={{
              selected: (date) => date.toDateString() === selectedDate.toDateString(),
              today: (date) => isToday(date) && date.toDateString() !== selectedDate.toDateString()
            }}
            modifiersClassNames={{
              selected: 'bg-primary text-primary-foreground cursor-pointer',
              today: 'bg-primary/20 text-primary cursor-pointer'
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
