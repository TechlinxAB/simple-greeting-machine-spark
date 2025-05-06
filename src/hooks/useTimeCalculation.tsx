
import { useState, useEffect } from "react";
import { differenceInMinutes, format, parse } from "date-fns";
import { UseFormWatch } from "react-hook-form";

interface UseTimeCalculationProps {
  watch: UseFormWatch<any>;
  startTimeRef?: React.RefObject<HTMLInputElement>;
  endTimeRef?: React.RefObject<HTMLInputElement>;
  disableRounding?: boolean;
}

export function useTimeCalculation({ 
  watch, 
  startTimeRef, 
  endTimeRef,
  disableRounding = false
}: UseTimeCalculationProps) {
  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);
  const [calculatedDuration, setCalculatedDuration] = useState<string | null>(null);

  useEffect(() => {
    const updateDuration = () => {
      const startTimeValue = watch("startTime");
      const endTimeValue = watch("endTime");
      
      if (startTimeValue && endTimeValue) {
        try {
          const today = new Date();
          
          // Use exact values from the inputs for most accurate time calculation
          let startHours, startMinutes, endHours, endMinutes;
          
          if (startTimeRef?.current?.value) {
            const [h, m] = startTimeRef.current.value.split(":");
            startHours = Number(h);
            startMinutes = Number(m);
          } else {
            [startHours, startMinutes] = startTimeValue.split(":").map(Number);
          }
          
          if (endTimeRef?.current?.value) {
            const [h, m] = endTimeRef.current.value.split(":");
            endHours = Number(h);
            endMinutes = Number(m);
          } else {
            [endHours, endMinutes] = endTimeValue.split(":").map(Number);
          }
          
          const startDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            startHours,
            startMinutes
          );
          
          const endDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            endHours,
            endMinutes
          );
          
          // If end time is earlier than start time, assume it's the next day
          if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
          }
          
          // Store the actual time values for display and submission
          setStartTimeDate(startDate);
          setEndTimeDate(endDate);
          
          // Calculate duration using the actual input times
          const actualMinutes = differenceInMinutes(endDate, startDate);
          const actualHours = Math.floor(actualMinutes / 60);
          const actualRemainingMinutes = actualMinutes % 60;
          
          setCalculatedDuration(`${actualHours}h ${actualRemainingMinutes}m`);
        } catch (error) {
          console.error("Error calculating duration:", error);
          setCalculatedDuration(null);
        }
      } else {
        setCalculatedDuration(null);
      }
    };
    
    updateDuration();
    
    // Set up a subscription to the form values
    const subscription = watch((value, { name }) => {
      if (name === "startTime" || name === "endTime") {
        updateDuration();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch, startTimeRef, endTimeRef]);

  /**
   * Rounds a date to the correct interval based on minutes following these exact rules:
   * - 0 minutes: No rounding
   * - 1-15 minutes: Round to 15 minutes
   * - 16-30 minutes: Round to 30 minutes
   * - 31-45 minutes: Round to 45 minutes
   * - 46-59 minutes: Round to the next hour
   */
  const applyTimeRounding = (time: Date | undefined): Date | undefined => {
    if (!time) return undefined;
    
    // Skip rounding if disabled (for example during editing)
    if (disableRounding) {
      return time;
    }
    
    const hours = time.getHours();
    const minutes = time.getMinutes();
    
    // If minutes is exactly 0, don't round
    if (minutes === 0) {
      return new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate(),
        hours,
        0
      );
    }
    
    let roundedMinutes: number;
    let roundedHours = hours;
    
    // Apply the correct rounding rules
    if (minutes >= 1 && minutes <= 15) {
      roundedMinutes = 15;
    } else if (minutes >= 16 && minutes <= 30) {
      roundedMinutes = 30;
    } else if (minutes >= 31 && minutes <= 45) {
      roundedMinutes = 45;
    } else {
      // If minutes > 45, round to the next hour
      roundedMinutes = 0;
      roundedHours = (hours + 1) % 24;
    }
    
    return new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      roundedHours,
      roundedMinutes
    );
  };

  // Function to ensure minimum 15-minute duration
  const ensureMinimumDuration = (startTime: Date, endTime: Date): Date => {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    // If duration is less than 15 minutes, add time to make it 15 minutes
    if (durationMinutes < 15) {
      const newEndTime = new Date(startTime.getTime() + (15 * 60 * 1000));
      return newEndTime;
    }
    
    return endTime;
  };

  // Parse time string in format "HH:mm" to Date object
  const parseTimeString = (timeString: string): Date | null => {
    if (!timeString) return null;
    
    try {
      const today = new Date();
      const [hours, minutes] = timeString.split(":").map(Number);
      
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        hours,
        minutes
      );
    } catch (error) {
      console.error("Error parsing time string:", error);
      return null;
    }
  };

  const handleTimeChange = (field: string, value: Date | null) => {
    if (value) {
      const timeString = format(value, "HH:mm");
      return timeString;
    }
    return undefined;
  };

  return {
    startTimeDate,
    endTimeDate,
    calculatedDuration,
    applyTimeRounding,
    ensureMinimumDuration,
    parseTimeString,
    handleTimeChange
  };
}
