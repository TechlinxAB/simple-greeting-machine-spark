
import { useState, useEffect } from "react";
import { differenceInMinutes, format, parse } from "date-fns";
import { UseFormWatch } from "react-hook-form";
import { roundDurationMinutes, minutesToHoursAndMinutes } from "@/lib/formatTime";

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
  const [actualMinutes, setActualMinutes] = useState<number | null>(null);
  const [roundedMinutes, setRoundedMinutes] = useState<number | null>(null);

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
          const minutes = differenceInMinutes(endDate, startDate);
          setActualMinutes(minutes);
          
          // Calculate the rounded duration based on the rules
          // Always calculate the rounded duration even if we're not using it
          const roundedMins = roundDurationMinutes(minutes);
          setRoundedMinutes(roundedMins);
          
          // Format the duration for display
          // If disableRounding is true, we show the actual duration, otherwise show the rounded duration
          const durationToUse = disableRounding ? minutes : roundedMins;
          const { hours, minutes: remainingMinutes } = minutesToHoursAndMinutes(durationToUse);
          
          console.log(`Duration calculation: ${startHours}:${startMinutes.toString().padStart(2, '0')} to ${endHours}:${endMinutes.toString().padStart(2, '0')} = ${minutes} minutes (${hours}h ${remainingMinutes}m)`);
          console.log(`Rounded duration: ${roundedMins} minutes`);
          
          setCalculatedDuration(`${hours}h ${remainingMinutes}m`);
        } catch (error) {
          console.error("Error calculating duration:", error);
          setCalculatedDuration(null);
          setActualMinutes(null);
          setRoundedMinutes(null);
        }
      } else {
        setCalculatedDuration(null);
        setActualMinutes(null);
        setRoundedMinutes(null);
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
  }, [watch, startTimeRef, endTimeRef, disableRounding]);

  /**
   * This function now returns the unchanged time without rounding
   * Kept for backward compatibility but its behavior is changed
   */
  const applyTimeRounding = (time: Date | undefined): Date | undefined => {
    return time; // Return the time exactly as is
  };

  // Function to ensure minimum 15-minute duration
  const ensureMinimumDuration = (startTime: Date, endTime: Date): Date => {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    // If duration is less than 15 minutes, add time to make it 15 minutes
    if (durationMinutes < 15) {
      const newEndTime = new Date(startTime.getTime() + (15 * 60 * 1000));
      console.log(`Adjusting minimum duration from ${durationMinutes} minutes to 15 minutes`);
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
      // Format the time exactly as entered, with no rounding
      const timeString = format(value, "HH:mm");
      return timeString;
    }
    return undefined;
  };

  // Get the final endTime with rounded duration applied (for billing purposes only)
  const getEndTimeWithRoundedDuration = (): Date | null => {
    if (!startTimeDate || roundedMinutes === null) return null;
    
    return new Date(startTimeDate.getTime() + roundedMinutes * 60 * 1000);
  };

  return {
    startTimeDate,
    endTimeDate,
    calculatedDuration,
    actualMinutes,
    roundedMinutes,
    applyTimeRounding,
    ensureMinimumDuration,
    parseTimeString,
    handleTimeChange,
    getEndTimeWithRoundedDuration
  };
}
