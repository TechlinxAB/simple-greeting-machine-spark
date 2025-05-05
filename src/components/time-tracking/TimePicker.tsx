
import { useState, useEffect, useRef, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (timeString: string) => void;
  roundToMinutes?: number;
  roundOnBlur?: boolean;
  onComplete?: () => void;
  disabled?: boolean;
  isCompact?: boolean;
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(({ 
  value, 
  onChange, 
  roundToMinutes = 15, 
  roundOnBlur = false,
  onComplete,
  disabled = false,
  isCompact = false
}, ref) => {
  const [timeInput, setTimeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Initialize from the provided string value
    if (value && typeof value === 'string') {
      setTimeInput(value);
    } else {
      setTimeInput("");
    }
  }, [value]);
  
  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const filtered = input.replace(/[^0-9:]/g, "");
    
    if (filtered.length <= 5) {
      if (filtered.length === 2 && !filtered.includes(":") && !timeInput.includes(":")) {
        setTimeInput(`${filtered}:`);
      } else {
        setTimeInput(filtered);
      }
    }
    
    if (filtered.length === 5 && filtered.includes(":")) {
      handleTimeUpdate(filtered, false);
      
      if (onComplete) {
        requestAnimationFrame(() => {
          setTimeout(onComplete, 50);
        });
      }
    }
  };
  
  const handleTimeUpdate = (timeStr: string = timeInput, shouldRound: boolean = roundOnBlur) => {
    if (!timeStr || timeStr.length < 5 || !timeStr.includes(":")) {
      onChange("");
      return;
    }
    
    const [hoursStr, minutesStr] = timeStr.split(":");
    let hours = parseInt(hoursStr) || 0;
    let minutes = parseInt(minutesStr) || 0;
    
    if (hours < 0) hours = 0;
    if (hours > 23) hours = 23;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    
    // Format hours and minutes as HH:MM
    let formattedHours = hours.toString().padStart(2, '0');
    let formattedMins = minutes.toString().padStart(2, '0');
    
    if (shouldRound && roundToMinutes > 0) {
      const roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
      let roundedHours = hours;
      let finalMinutes = roundedMinutes;
      
      if (roundedMinutes >= 60) {
        roundedHours = hours + Math.floor(roundedMinutes / 60);
        finalMinutes = roundedMinutes % 60;
        
        if (roundedHours >= 24) {
          roundedHours = roundedHours % 24;
        }
      }
      
      formattedHours = roundedHours.toString().padStart(2, '0');
      formattedMins = finalMinutes.toString().padStart(2, '0');
    }
    
    const formattedTime = `${formattedHours}:${formattedMins}`;
    setTimeInput(formattedTime);
    onChange(formattedTime);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      if (timeInput) {
        handleTimeUpdate(timeInput, roundOnBlur);
      }
      if (e.key === "Enter" && onComplete) {
        e.preventDefault();
        requestAnimationFrame(() => {
          setTimeout(onComplete, 50);
        });
      }
    }
  };
  
  const handleBlur = () => {
    if (timeInput) {
      handleTimeUpdate(timeInput, roundOnBlur);
      if (timeInput.length === 5 && onComplete) {
        requestAnimationFrame(() => {
          setTimeout(onComplete, 50);
        });
      }
    }
  };

  return (
    <div className="relative w-full">
      <Input
        ref={(el) => {
          if (typeof ref === 'function') {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
          inputRef.current = el;
        }}
        value={timeInput}
        onChange={handleTimeInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("w-full text-base", isCompact && "h-8 text-sm")}
        placeholder="HH:MM"
        maxLength={5}
        disabled={disabled}
        onFocus={() => {
          inputRef.current?.select();
        }}
        data-testid="time-picker-input"
      />
    </div>
  );
});

TimePicker.displayName = "TimePicker";
