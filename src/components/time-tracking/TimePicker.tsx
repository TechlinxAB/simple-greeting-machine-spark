
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
      handleTimeUpdate(filtered, false); // Don't apply rounding when input is complete
      
      // Make sure onComplete is called after the time is properly updated
      if (onComplete) {
        // Use setTimeout with a longer delay to ensure the state is updated before triggering the callback
        setTimeout(onComplete, 100);
      }
    }
  };
  
  // Parse time and create Date object with ceiling (round up) to nearest interval
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
    
    // Apply rounding if required - using ceiling instead of round to always round up
    if (shouldRound && roundToMinutes > 0) {
      // Round up to the nearest interval
      const roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
      
      // If rounding exceeds 59 minutes, increment hour
      let roundedHours = hours;
      let finalMinutes = roundedMinutes;
      
      if (roundedMinutes >= 60) {
        roundedHours = hours + Math.floor(roundedMinutes / 60);
        finalMinutes = roundedMinutes % 60;
        
        // Handle hour overflow
        if (roundedHours >= 24) {
          roundedHours = roundedHours % 24;
        }
      }
      
      // Set the rounded time
      newDate.setHours(roundedHours);
      newDate.setMinutes(finalMinutes);
      
      // Update the input field to show the rounded time
      const formattedHours = roundedHours.toString().padStart(2, '0');
      const formattedMins = finalMinutes.toString().padStart(2, '0');
      setTimeInput(`${formattedHours}:${formattedMins}`);
    }
    
    onChange(newDate);
  };
  
  // Handle when the user presses Enter or Tab
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      if (timeInput) {
        handleTimeUpdate(timeInput, roundOnBlur); // Only apply rounding if roundOnBlur is true
      }
      if (e.key === "Enter" && onComplete) {
        e.preventDefault();
        // Use setTimeout with a longer delay to ensure the state is updated before triggering the callback
        setTimeout(onComplete, 100);
      }
    }
  };
  
  // Handle blur event
  const handleBlur = () => {
    if (timeInput) {
      handleTimeUpdate(timeInput, roundOnBlur);
      // Call onComplete when field is completed via blur
      if (timeInput.length === 5 && onComplete) {
        setTimeout(onComplete, 100);
      }
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
