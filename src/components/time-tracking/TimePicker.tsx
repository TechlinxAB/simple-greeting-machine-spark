
import { useState, useEffect, useRef, forwardRef } from "react";
import { Input } from "@/components/ui/input";

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  roundToMinutes?: number;
  roundOnBlur?: boolean;
  onComplete?: () => void;
  disabled?: boolean;
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(({ 
  value, 
  onChange, 
  roundToMinutes = 15, 
  roundOnBlur = false,
  onComplete,
  disabled = false
}, ref) => {
  const [timeInput, setTimeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Update the time input when the value changes
  useEffect(() => {
    if (value && value instanceof Date) {
      const hours = value.getHours().toString().padStart(2, '0');
      const minutes = value.getMinutes().toString().padStart(2, '0');
      setTimeInput(`${hours}:${minutes}`);
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
    
    // Check if 5 characters have been entered (full time in format HH:MM)
    if (filtered.length === 5 && filtered.includes(":")) {
      // If we have a complete time, create the Date object immediately
      setTimeout(() => {
        handleTimeUpdate(filtered, false); // Don't round on auto-complete
        if (onComplete) {
          onComplete();
        }
      }, 50);
    }
  };
  
  // Parse time and create Date object
  const handleTimeUpdate = (timeStr: string = timeInput, shouldRound: boolean = roundOnBlur) => {
    if (!timeStr || timeStr.length < 5 || !timeStr.includes(":")) {
      onChange(null);
      return;
    }
    
    const [hoursStr, minutesStr] = timeStr.split(":");
    let hours = parseInt(hoursStr) || 0;
    let minutes = parseInt(minutesStr) || 0;
    
    // Validate hours and minutes
    if (hours < 0) hours = 0;
    if (hours > 23) hours = 23;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    
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
    
    // Never apply rounding unless explicitly required
    if (shouldRound && roundToMinutes > 0) {
      const roundedMinutes = Math.round(minutes / roundToMinutes) * roundToMinutes;
      if (roundedMinutes !== minutes) {
        newDate.setMinutes(roundedMinutes);
        // Update the input field to show the rounded time
        const roundedHours = newDate.getHours().toString().padStart(2, '0');
        const roundedMins = newDate.getMinutes().toString().padStart(2, '0');
        setTimeInput(`${roundedHours}:${roundedMins}`);
      }
    }
    
    onChange(newDate);
  };
  
  // Handle when the user presses Enter or Tab
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      if (timeInput) {
        handleTimeUpdate(timeInput, false); // Don't round on key events
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (onComplete) {
          onComplete();
        }
      }
    }
  };
  
  // Handle blur event
  const handleBlur = () => {
    if (timeInput) {
      handleTimeUpdate(timeInput, roundOnBlur);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        ref={(el) => {
          // Assign to both forwarded ref and local ref
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
        className="w-full text-base"
        placeholder="HH:mm"
        maxLength={5}
        disabled={disabled}
        onFocus={() => {
          inputRef.current?.select();
        }}
      />
    </div>
  );
});

TimePicker.displayName = "TimePicker";
