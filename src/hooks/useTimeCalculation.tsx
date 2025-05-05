
import { useState, useEffect } from "react";
import { differenceInMinutes, format } from "date-fns";
import { UseFormWatch } from "react-hook-form";

interface UseTimeCalculationProps {
  watch: UseFormWatch<any>;
  startTimeRef?: React.RefObject<HTMLInputElement>;
  endTimeRef?: React.RefObject<HTMLInputElement>;
}

export function useTimeCalculation({ watch, startTimeRef, endTimeRef }: UseTimeCalculationProps) {
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
          const [startHours, startMinutes] = startTimeValue.split(":");
          const [endHours, endMinutes] = endTimeValue.split(":");
          
          const startDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            Number(startHours),
            Number(startMinutes)
          );
          
          const endDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            Number(endHours),
            Number(endMinutes)
          );
          
          // If end time is earlier than start time, assume it's the next day
          if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
          }
          
          const minutes = differenceInMinutes(endDate, startDate);
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          
          setCalculatedDuration(`${hours}h ${remainingMinutes}m`);
          setStartTimeDate(startDate);
          setEndTimeDate(endDate);
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
  }, [watch]);

  /**
   * Rounds a date to the next 15-minute interval based on minutes:
   * - 0-15 minutes: Round to 15 minutes
   * - 16-30 minutes: Round to 30 minutes
   * - 31-45 minutes: Round to 45 minutes
   * - 46-59 minutes: Round to the next hour
   */
  const applyTimeRounding = (time: Date | undefined): Date | undefined => {
    if (!time) return undefined;
    
    const hours = time.getHours();
    const minutes = time.getMinutes();
    
    let roundedMinutes: number;
    
    if (minutes <= 15) {
      roundedMinutes = 15;
    } else if (minutes <= 30) {
      roundedMinutes = 30;
    } else if (minutes <= 45) {
      roundedMinutes = 45;
    } else {
      // If minutes > 45, round to the next hour
      return new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate(),
        hours + 1,
        0
      );
    }
    
    return new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      hours,
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
    handleTimeChange
  };
}
