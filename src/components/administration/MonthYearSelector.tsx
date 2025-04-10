
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      onMonthYearChange(11, selectedYear - 1);
    } else {
      onMonthYearChange(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onMonthYearChange(0, selectedYear + 1);
    } else {
      onMonthYearChange(selectedMonth + 1, selectedYear);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onMonthYearChange(now.getMonth(), now.getFullYear());
  };

  return (
    <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-2">
      {includeAllOption && (
        <Button 
          variant={isAllSelected ? "default" : "outline"} 
          size="sm" 
          onClick={onAllSelected} 
          className="w-full sm:w-auto justify-center"
        >
          All Time
        </Button>
      )}
      
      <div className={`flex space-x-2 ${isAllSelected ? 'opacity-50' : ''}`}>
        <div className="flex items-center space-x-1">
          <Select 
            disabled={isAllSelected}
            value={selectedMonth.toString()} 
            onValueChange={(value) => {
              if (isAllSelected) return;
              onMonthYearChange(parseInt(value), selectedYear);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={month} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            disabled={isAllSelected}
            value={selectedYear.toString()} 
            onValueChange={(value) => {
              if (isAllSelected) return;
              onMonthYearChange(selectedMonth, parseInt(value));
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
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
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCurrentMonth} 
          disabled={isAllSelected}
        >
          Current
        </Button>
      </div>
    </div>
  );
}
