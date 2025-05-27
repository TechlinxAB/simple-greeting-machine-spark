
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthYearPickerProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export function MonthYearPicker({ 
  selectedMonth, 
  selectedYear, 
  onMonthChange, 
  onYearChange 
}: MonthYearPickerProps) {
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Generate years (current year - 5 to current year + 3)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, i) => currentYear - 5 + i);
  
  return (
    <div className="flex space-x-2">
      <Select
        value={selectedMonth.toString()}
        onValueChange={(value) => onMonthChange(parseInt(value))}
      >
        <SelectTrigger className="w-[110px] h-9 text-xs">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, index) => (
            <SelectItem key={month} value={index.toString()}>
              {month.substring(0, 3)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) => onYearChange(parseInt(value))}
      >
        <SelectTrigger className="w-[80px] h-9 text-xs">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
