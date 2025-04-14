
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface MonthYearSelectorProps {
  selectedMonth: number; // 0-11
  selectedYear: number;
  onMonthYearChange: (month: number, year: number) => void;
  includeAllOption?: boolean;
  onAllSelected?: () => void;
  isAllSelected?: boolean;
}

export function MonthYearSelector({
  selectedMonth,
  selectedYear,
  onMonthYearChange,
  includeAllOption = false,
  onAllSelected,
  isAllSelected = false
}: MonthYearSelectorProps) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <Select value={selectedMonth.toString()} onValueChange={value => onMonthYearChange(parseInt(value), selectedYear)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue>
              {months[selectedMonth]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((month, index) => <SelectItem key={month} value={index.toString()}>
                {month}
              </SelectItem>)}
          </SelectContent>
        </Select>
        
        <Select value={selectedYear.toString()} onValueChange={value => onMonthYearChange(selectedMonth, parseInt(value))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue>
              {selectedYear}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map(year => <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>)}
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
          All Time
        </Button>
      )}
    </div>
  );
}
