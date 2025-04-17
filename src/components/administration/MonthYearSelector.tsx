import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface MonthYearSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthYearChange: (month: number, year: number) => void;
  includeAllOption?: boolean;
  onAllSelected?: () => void;
  isAllSelected?: boolean;
  className?: string;
}

export function MonthYearSelector({
  selectedMonth,
  selectedYear,
  onMonthYearChange,
  includeAllOption = false,
  onAllSelected,
  isAllSelected = false,
  className
}: MonthYearSelectorProps) {
  const { t } = useTranslation();
  
  const months = [
    t('common.months.january'),
    t('common.months.february'),
    t('common.months.march'),
    t('common.months.april'),
    t('common.months.may'),
    t('common.months.june'),
    t('common.months.july'),
    t('common.months.august'),
    t('common.months.september'),
    t('common.months.october'),
    t('common.months.november'),
    t('common.months.december')
  ];

  // Generate a reasonable year range (5 years back, 3 years forward)
  const currentYear = new Date().getFullYear();
  const years = Array.from({
    length: 9
  }, (_, i) => currentYear - 5 + i);
  
  const handleCurrentMonth = () => {
    const now = new Date();
    onMonthYearChange(now.getMonth(), now.getFullYear());
  };
  
  return (
    <div className={`flex items-center space-x-2 ${className || ""}`}>
      <div className="flex items-center space-x-1">
        <Select value={selectedMonth.toString()} onValueChange={value => onMonthYearChange(parseInt(value), selectedYear)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue>
              {months[selectedMonth]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((month, index) => (
              <SelectItem key={month} value={index.toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedYear.toString()} onValueChange={value => onMonthYearChange(selectedMonth, parseInt(value))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue>
              {selectedYear}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {includeAllOption && (
        <Button 
          variant={isAllSelected ? "default" : "outline"} 
          size="sm" 
          onClick={onAllSelected}
          className="w-auto"
        >
          {t('common.allTime')}
        </Button>
      )}
    </div>
  );
}
