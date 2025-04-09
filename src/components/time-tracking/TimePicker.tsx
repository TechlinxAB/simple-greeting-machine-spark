
import { useState, useEffect } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { addMinutes, format, set } from "date-fns";

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  roundToMinutes?: number;
}

export function TimePicker({ value, onChange, roundToMinutes = 15 }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  
  // Initialize fields from value when component mounts or value changes
  useEffect(() => {
    if (value) {
      setHours(format(value, "h"));
      setMinutes(format(value, "mm"));
      setPeriod(format(value, "a").toUpperCase() as "AM" | "PM");
    }
  }, [value]);
  
  // Apply rounding to the selected time as per the requirements
  const applyTimeRounding = (date: Date): Date => {
    if (!roundToMinutes) return date;
    
    const mins = date.getMinutes();
    let roundedMins = 0;
    
    // Rules: 
    // - Less than 15 minutes rounds to 15
    // - 15-29 minutes rounds to 30
    // - 30-44 minutes rounds to 45
    // - 45+ minutes rounds to next hour
    if (mins < 15) {
      roundedMins = 15;
    } else if (mins < 30) {
      roundedMins = 30;
    } else if (mins < 45) {
      roundedMins = 45;
    } else {
      roundedMins = 0;
      date = addMinutes(date, 60 - mins); // Add remaining minutes to next hour
    }
    
    const result = new Date(date);
    result.setMinutes(roundedMins);
    result.setSeconds(0);
    result.setMilliseconds(0);
    
    return result;
  };
  
  // Update the time based on selected hours, minutes and period
  const updateTime = () => {
    try {
      // Validate inputs
      const parsedHours = parseInt(hours);
      const parsedMinutes = parseInt(minutes);
      
      if (isNaN(parsedHours) || parsedHours < 1 || parsedHours > 12) {
        throw new Error("Hours must be between 1 and 12");
      }
      
      if (isNaN(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 59) {
        throw new Error("Minutes must be between 0 and 59");
      }
      
      // Create a new date with the selected time
      const now = new Date();
      let newDate = set(now, {
        hours: period === "PM" && parsedHours < 12 ? parsedHours + 12 : 
               period === "AM" && parsedHours === 12 ? 0 : parsedHours,
        minutes: parsedMinutes,
        seconds: 0,
        milliseconds: 0
      });
      
      // Apply rounding if specified
      newDate = applyTimeRounding(newDate);
      
      // Update the value
      onChange(newDate);
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating time:", error);
    }
  };
  
  const timeDisplay = value 
    ? format(value, "h:mm a") 
    : "HH:MM";
  
  // Generate time preset buttons (hourly intervals)
  const generateTimePresets = () => {
    const presets = [];
    const now = new Date();
    const baseTime = set(now, { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 });
    
    for (let i = 0; i < 12; i++) {
      const time = addMinutes(baseTime, i * 60);
      presets.push(
        <Button
          key={i}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            const roundedTime = applyTimeRounding(time);
            onChange(roundedTime);
            setIsOpen(false);
          }}
        >
          {format(time, "h:mm a")}
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
        >
          <Clock className="mr-2 h-4 w-4" />
          {timeDisplay}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Hour
              </div>
              <Input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full"
                placeholder="12"
                maxLength={2}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Minute
              </div>
              <Input
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full"
                placeholder="00"
                maxLength={2}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Period
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant={period === "AM" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod("AM")}
                  className="w-full"
                >
                  AM
                </Button>
                <Button
                  variant={period === "PM" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod("PM")}
                  className="w-full"
                >
                  PM
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {generateTimePresets()}
          </div>
          
          <div className="flex justify-end">
            <Button size="sm" onClick={updateTime}>
              Select
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
