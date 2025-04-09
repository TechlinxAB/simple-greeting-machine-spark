
import { useState, useEffect, useRef } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { format, set } from "date-fns";

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  roundToMinutes?: number;
}

export function TimePicker({ value, onChange, roundToMinutes = 15 }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Update the time input when the value changes
  useEffect(() => {
    if (value) {
      setTimeInput(format(value, "HH:mm"));
    } else {
      setTimeInput("");
    }
  }, [value]);
  
  // Apply rounding to the minutes based on the requirements
  const applyRounding = (hours: number, minutes: number): { hours: number, minutes: number } => {
    if (!roundToMinutes) return { hours, minutes };
    
    // Rules for 15-minute intervals:
    // - Less than 15 minutes rounds to 15
    // - 15-29 minutes rounds to 30
    // - 30-44 minutes rounds to 45
    // - 45+ minutes rounds to next hour
    if (minutes < 15) {
      return { hours, minutes: 15 };
    } else if (minutes < 30) {
      return { hours, minutes: 30 };
    } else if (minutes < 45) {
      return { hours, minutes: 45 };
    } else {
      return { hours: (hours + 1) % 24, minutes: 0 };
    }
  };
  
  // Handle direct time input
  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Only allow numbers and colon
    const filtered = input.replace(/[^0-9:]/g, "");
    
    // Format as we type
    if (filtered.length <= 5) {
      if (filtered.length === 2 && !filtered.includes(":") && !timeInput.includes(":")) {
        // Automatically add colon after hours
        setTimeInput(`${filtered}:`);
      } else {
        setTimeInput(filtered);
      }
    }
  };
  
  // Validate and update time when input loses focus
  const handleBlur = () => {
    if (!timeInput) {
      onChange(null);
      return;
    }
    
    let hours = 0;
    let minutes = 0;
    
    if (timeInput.includes(":")) {
      const [hoursStr, minutesStr] = timeInput.split(":");
      hours = parseInt(hoursStr) || 0;
      minutes = parseInt(minutesStr) || 0;
    } else if (timeInput.length <= 2) {
      hours = parseInt(timeInput) || 0;
    } else if (timeInput.length <= 4) {
      hours = parseInt(timeInput.substring(0, 2)) || 0;
      minutes = parseInt(timeInput.substring(2)) || 0;
    }
    
    // Validate hours and minutes
    if (hours < 0 || hours > 23) hours = 0;
    if (minutes < 0 || minutes > 59) minutes = 0;
    
    // Apply rounding
    const roundedTime = applyRounding(hours, minutes);
    
    // Create a new date with the selected time
    const now = new Date();
    const newDate = set(now, {
      hours: roundedTime.hours,
      minutes: roundedTime.minutes,
      seconds: 0,
      milliseconds: 0
    });
    
    onChange(newDate);
    setTimeInput(format(newDate, "HH:mm"));
  };
  
  // Handle when the user presses Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
      inputRef.current?.blur();
    }
  };
  
  // Generate time preset buttons (hourly intervals)
  const generateTimePresets = () => {
    const presets = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i += 2) {
      const time = set(now, { hours: i, minutes: 0, seconds: 0, milliseconds: 0 });
      presets.push(
        <Button
          key={i}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            const newDate = set(now, { hours: i, minutes: 0, seconds: 0, milliseconds: 0 });
            onChange(newDate);
            setTimeInput(format(newDate, "HH:mm"));
            setIsOpen(false);
          }}
        >
          {format(time, "HH:mm")}
        </Button>
      );
    }
    
    return presets;
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline" 
          className="w-full justify-start text-left font-normal"
          onClick={() => {
            setIsOpen(true);
            // Focus the input after a short delay to ensure the popover is open
            setTimeout(() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }, 100);
          }}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? format(value, "HH:mm") : "HH:mm"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Enter time (24h format)</div>
            <Input
              ref={inputRef}
              value={timeInput}
              onChange={handleTimeInput}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full text-center text-lg"
              placeholder="HH:mm"
              maxLength={5}
              autoFocus
            />
            <div className="text-xs text-muted-foreground text-center">
              Format: 24-hour (e.g., 13:45)
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-1">
            {generateTimePresets()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
