
import { useState, useEffect, useRef } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { format } from "date-fns";

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  roundToMinutes?: number;
  roundOnBlur?: boolean;
  onComplete?: () => void;
}

export function TimePicker({ 
  value, 
  onChange, 
  roundToMinutes = 15, 
  roundOnBlur = false,
  onComplete
}: TimePickerProps) {
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
    
    // Create a new date with the selected time
    const now = new Date();
    const newDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0
    );
    
    onChange(newDate);
    setTimeInput(format(newDate, "HH:mm"));
    setIsOpen(false);
    
    // Call onComplete if provided
    if (onComplete) {
      onComplete();
    }
  };
  
  // Handle when the user presses Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  };
  
  return (
    <div className="relative w-full">
      <Button
        type="button"
        variant="outline" 
        className="w-full justify-start text-left font-normal"
        onClick={() => {
          setIsOpen(!isOpen);
          // Focus the input after a short delay to ensure the popover is open
          if (!isOpen) {
            setTimeout(() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }, 100);
          }
        }}
      >
        <Clock className="mr-2 h-4 w-4" />
        {value ? format(value, "HH:mm") : "HH:mm"}
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full border rounded-md bg-background shadow-md">
          <div className="p-3">
            <div className="text-sm font-medium mb-2">Enter time (24h format)</div>
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
            <div className="text-xs text-muted-foreground text-center mt-1">
              Format: 24-hour (e.g., 13:45)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
