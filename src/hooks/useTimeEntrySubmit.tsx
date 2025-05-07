
import { useState } from "react";
import { format, parse, differenceInMinutes, addMinutes } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { UseFormReturn } from "react-hook-form";
import { useTimeCalculation } from "./useTimeCalculation";
import { roundDurationMinutes } from "@/lib/formatTime";

interface UseTimeEntrySubmitProps {
  timeEntry: any;
  form: UseFormReturn<any>;
  onSuccess: () => void;
  startTimeRef?: React.RefObject<HTMLInputElement>;
  endTimeRef?: React.RefObject<HTMLInputElement>;
}

export function useTimeEntrySubmit({ 
  timeEntry, 
  form, 
  onSuccess,
  startTimeRef,
  endTimeRef
}: UseTimeEntrySubmitProps) {
  const [loading, setLoading] = useState(false);
  
  // Remove disableRounding flag for editing - we want to always apply rounding
  const {
    parseTimeString,
    applyTimeRounding
  } = useTimeCalculation({
    watch: form.watch,
    startTimeRef,
    endTimeRef,
    disableRounding: false // Always apply rounding rules
  });

  const handleSubmit = async (values: any) => {
    console.log("Form values:", values);
    
    try {
      setLoading(true);
      
      let startTimeString = values.startTime;
      let endTimeString = values.endTime;
      
      // Get time directly from refs if available (most accurate)
      if (startTimeRef?.current?.value) {
        startTimeString = startTimeRef.current.value;
        console.log("Using startTime from ref:", startTimeString);
      }
      
      if (endTimeRef?.current?.value) {
        endTimeString = endTimeRef.current.value;
        console.log("Using endTime from ref:", endTimeString);
      }
      
      console.log("Final time strings - Start:", startTimeString, "End:", endTimeString);
      
      const timeEntryDate = timeEntry.created_at 
        ? new Date(timeEntry.created_at) 
        : new Date();
        
      const datePart = format(timeEntryDate, "yyyy-MM-dd");
      
      let startTime = null;
      let endTime = null;
      let originalStartTime = null;
      let originalEndTime = null;
      
      const isEditing = !!timeEntry.id;
      const isNew = !isEditing;
      
      // Process start time if activity type
      if (startTimeString && values.productType === "activity") {
        // Parse the time string into a Date object
        const startDate = parseTimeString(startTimeString);
        if (!startDate) {
          throw new Error("Invalid start time format");
        }
        
        // Store exact, unrounded times
        const startTimeIsoString = `${datePart}T${startTimeString}:00`;
        originalStartTime = startTimeIsoString;
        startTime = startTimeIsoString; // We don't round individual times anymore
        console.log("Start time (no rounding):", startTimeIsoString);
      }
      
      // Process end time if activity type
      if (endTimeString && values.productType === "activity") {
        // Parse the time string into a Date object
        const endDateValue = parseTimeString(endTimeString);
        if (!endDateValue) {
          throw new Error("Invalid end time format");
        }
        
        // Store exact, unrounded end time
        const endTimeIsoString = `${datePart}T${endTimeString}:00`;
        originalEndTime = endTimeIsoString;
        
        // For both new entries and editing, we need to:
        // 1. Calculate the exact duration between start and end times
        // 2. Round that duration according to our rules
        // 3. Add the rounded duration to the start time to get the final end time
        const startDateValue = parseTimeString(startTimeString);
        
        if (startDateValue && endDateValue) {
          // Handle day crossing
          let adjustedEndDate = new Date(endDateValue);
          if (adjustedEndDate < startDateValue) {
            adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
          }
          
          // Calculate the exact duration in minutes
          const durationMinutes = differenceInMinutes(adjustedEndDate, startDateValue);
          console.log("Actual duration in minutes:", durationMinutes);
          
          // Round the duration according to our rules
          const roundedMinutes = roundDurationMinutes(durationMinutes);
          console.log("Rounded duration in minutes:", roundedMinutes);
          
          // Calculate the new end time by adding the rounded duration to the start time
          const roundedEndDate = addMinutes(startDateValue, roundedMinutes);
          
          // Format the rounded end time
          endTime = `${datePart}T${format(roundedEndDate, "HH:mm")}:00`;
          console.log("Final end time with rounded duration:", endTime);
        }
      }
      
      // Validate times to ensure end time is after start time
      if (startTime && endTime) {
        const startDate = new Date(startTime);
        let endDate = new Date(endTime);
        
        // Log durations at different stages
        console.log("Final duration calculation:");
        let minutes = differenceInMinutes(endDate, startDate);
        console.log(`- Start: ${format(startDate, "HH:mm")}, End: ${format(endDate, "HH:mm")}`);
        console.log(`- Duration: ${Math.floor(minutes / 60)}h ${minutes % 60}m (${minutes} minutes)`);
        
        // Handle day crossing (when end time is earlier than start time)
        if (endDate < startDate) {
          console.log("End time is before start time, adjusting to next day");
          const nextDay = new Date(endTime);
          nextDay.setDate(nextDay.getDate() + 1);
          endTime = nextDay.toISOString();
          endDate = nextDay;
          
          // Log after day adjustment
          minutes = differenceInMinutes(endDate, startDate);
          console.log("After day crossing adjustment:");
          console.log(`- Start: ${format(startDate, "HH:mm")}, End: ${format(endDate, "HH:mm")}`);
          console.log(`- Duration: ${Math.floor(minutes / 60)}h ${minutes % 60}m (${minutes} minutes)`);
        }
      }
      
      // Final validation check to prevent impossible time combinations
      if (startTime && endTime) {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        
        console.log("Final validation - Start:", format(startDate, "HH:mm"), "End:", format(endDate, "HH:mm"));
        
        if (endDate < startDate) {
          console.error("End time is still before start time after adjustments");
          throw new Error("End time cannot be before start time");
        }
        
        // Calculate and log duration for debugging
        const durationMinutes = differenceInMinutes(endDate, startDate);
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        console.log(`Final duration: ${hours}h ${minutes}m (${durationMinutes} minutes)`);
      }
      
      const timeEntryData: any = {
        client_id: values.clientId,
        product_id: values.productId,
        description: values.description,
      };
      
      // Always set custom_price in the data object
      // This ensures it's explicitly included in the update
      timeEntryData.custom_price = values.customPrice;
      
      console.log("Custom price value being saved:", values.customPrice);

      if (values.productType === "activity") {
        timeEntryData.start_time = startTime;
        timeEntryData.end_time = endTime;
        timeEntryData.original_start_time = originalStartTime;
        timeEntryData.original_end_time = originalEndTime;
        timeEntryData.quantity = null;
      } else if (values.productType === "item") {
        timeEntryData.quantity = values.quantity;
        timeEntryData.start_time = null;
        timeEntryData.end_time = null;
        timeEntryData.original_start_time = null;
        timeEntryData.original_end_time = null;
      }
      
      console.log("Updating time entry with data:", timeEntryData);
      console.log("Time entry ID:", timeEntry.id);

      const { error } = await supabase
        .from("time_entries")
        .update(timeEntryData)
        .eq("id", timeEntry.id);

      if (error) {
        console.error("Error from Supabase:", error);
        throw new Error(error.message);
      }
      
      console.log("Update successful");
      
      toast.success("Time entry updated successfully");
      onSuccess(); 
    } catch (error: any) {
      console.error("Error updating time entry:", error);
      toast.error(error.message || "Failed to update time entry");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmit
  };
}
