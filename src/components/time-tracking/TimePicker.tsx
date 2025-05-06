
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
  
  // When value prop changes, update the internal timeInput state
  useEffect(() => {
    if (value && value instanceof Date) {
      const hours = value.getHours().toString().padStart(2, '0');
      const minutes = value.getMinutes().toString().padStart(2, '0');
      setTimeInput(`${hours}:${minutes}`);
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
      handleTimeUpdate(filtered, false); // Don't round when typing
      
      if (onComplete) {
        requestAnimationFrame(() => {
          setTimeout(onComplete, 50);
        });
      }
    }
  };
  
  const handleTimeUpdate = (timeStr: string = timeInput, shouldRound: boolean = roundOnBlur) => {
    if (!timeStr || timeStr.length < 5 || !timeStr.includes(":")) {
      onChange(null);
      return;
    }
    
    const [hoursStr, minutesStr] = timeStr.split(":");
    let hours = parseInt(hoursStr) || 0;
    let minutes = parseInt(minutesStr) || 0;
    
    if (hours < 0) hours = 0;
    if (hours > 23) hours = 23;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    
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
    
    // Skip rounding when editing existing entries to maintain exact time values
    if (shouldRound && roundToMinutes > 0) {
      // Don't round if minutes is exactly 0
      if (minutes === 0) {
        onChange(newDate);
        return;
      }
      
      // Round according to requirements:
      // - 1-15 minutes = 15 minutes
      // - 16-30 minutes = 30 minutes
      // - 31-45 minutes = 45 minutes
      // - 46-60 minutes = 60 minutes (next hour)
      let roundedHours = hours;
      let roundedMinutes = 0;
      
      if (minutes <= 15) {
        roundedMinutes = 15;
      } else if (minutes <= 30) {
        roundedMinutes = 30;
      } else if (minutes <= 45) {
        roundedMinutes = 45;
      } else {
        roundedHours = (hours + 1) % 24;
        roundedMinutes = 0;
      }
      
      const roundedDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        roundedHours,
        roundedMinutes,
        0,
        0
      );
      
      // Update display to show rounded time
      const formattedHours = roundedHours.toString().padStart(2, '0');
      const formattedMins = roundedMinutes.toString().padStart(2, '0');
      setTimeInput(`${formattedHours}:${formattedMins}`);
      
      onChange(roundedDate);
    } else {
      // No rounding, use exact values
      onChange(newDate);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      if (timeInput) {
        handleTimeUpdate(timeInput, false); // Don't round on keyboard navigation
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
        className="w-full text-base"
        placeholder="HH:mm"
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
