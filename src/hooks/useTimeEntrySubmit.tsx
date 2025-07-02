
import { useState } from "react";
import { format, differenceInMinutes } from "date-fns";
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
    parseTimeString
  } = useTimeCalculation({
    watch: form.watch,
    startTimeRef,
    endTimeRef,
    disableRounding: false // Always apply rounding rules
  });

  const handleSubmit = async (values: any) => {
    console.log("useTimeEntrySubmit - Form values:", values);
    
    try {
      setLoading(true);
      
      let startTimeString = values.startTime;
      let endTimeString = values.endTime;
      
      // Get time directly from refs if available (most accurate)
      if (startTimeRef?.current?.value) {
        startTimeString = startTimeRef.current.value;
        console.log("useTimeEntrySubmit - Using startTime from ref:", startTimeString);
      }
      
      if (endTimeRef?.current?.value) {
        endTimeString = endTimeRef.current.value;
        console.log("useTimeEntrySubmit - Using endTime from ref:", endTimeString);
      }
      
      console.log("useTimeEntrySubmit - Final time strings - Start:", startTimeString, "End:", endTimeString);
      
      // CRITICAL FIX: Preserve the original date when editing
      // Extract the date from the existing time entry to maintain the same day
      let timeEntryDate = new Date();
      
      if (timeEntry.start_time) {
        // Extract date part from existing start_time to preserve the original date
        const existingStartTime = new Date(timeEntry.start_time);
        timeEntryDate = new Date(existingStartTime.getFullYear(), existingStartTime.getMonth(), existingStartTime.getDate());
        console.log("useTimeEntrySubmit - Using original date from existing entry:", format(timeEntryDate, "yyyy-MM-dd"));
      } else if (timeEntry.created_at) {
        const createdAt = new Date(timeEntry.created_at);
        timeEntryDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
        console.log("useTimeEntrySubmit - Using date from created_at:", format(timeEntryDate, "yyyy-MM-dd"));
      }
        
      const datePart = format(timeEntryDate, "yyyy-MM-dd");
      console.log("useTimeEntrySubmit - Using date part:", datePart);
      
      let startTime = null;
      let endTime = null;
      let originalStartTime = null;
      let originalEndTime = null;
      let roundedDurationMinutes = null;
      
      const isEditing = !!timeEntry.id;
      const isNew = !isEditing;
      
      // Process start time if activity type
      if (startTimeString && values.productType === "activity") {
        // Store exact, unrounded times with the preserved date
        const startTimeIsoString = `${datePart}T${startTimeString}:00`;
        originalStartTime = startTimeIsoString;
        startTime = startTimeIsoString; // Store exact time as entered
        console.log("useTimeEntrySubmit - Start time (exact with preserved date):", startTimeIsoString);
      }
      
      // Process end time if activity type
      if (endTimeString && values.productType === "activity") {
        // Store exact, unrounded end time with the preserved date
        const endTimeIsoString = `${datePart}T${endTimeString}:00`;
        originalEndTime = endTimeIsoString;
        endTime = endTimeIsoString; // Store exact time as entered
        console.log("useTimeEntrySubmit - End time (exact with preserved date):", endTimeIsoString);
      }
      
      // Validate times and calculate the rounded duration
      if (startTime && endTime) {
        const startDate = new Date(startTime);
        let endDateTime = new Date(endTime);
        
        // Log durations at different stages
        console.log("useTimeEntrySubmit - Final duration calculation:");
        let minutes = differenceInMinutes(endDateTime, startDate);
        console.log(`- Start: ${format(startDate, "HH:mm")}, End: ${format(endDateTime, "HH:mm")}`);
        console.log(`- Duration: ${Math.floor(minutes / 60)}h ${minutes % 60}m (${minutes} minutes)`);
        
        // Handle day crossing (when end time is earlier than start time)
        if (endDateTime < startDate) {
          console.log("useTimeEntrySubmit - End time is before start time, adjusting to next day");
          const nextDay = new Date(endTime);
          nextDay.setDate(nextDay.getDate() + 1);
          endTime = nextDay.toISOString();
          endDateTime = nextDay;
          
          // Update originalEndTime as well for consistency
          originalEndTime = endTime;
          
          // Log after day adjustment
          minutes = differenceInMinutes(endDateTime, startDate);
          console.log("useTimeEntrySubmit - After day crossing adjustment:");
          console.log(`- Start: ${format(startDate, "HH:mm")}, End: ${format(endDateTime, "HH:mm")}`);
          console.log(`- Duration: ${Math.floor(minutes / 60)}h ${minutes % 60}m (${minutes} minutes)`);
        }
        
        // Calculate the rounded duration based on our business rules
        roundedDurationMinutes = roundDurationMinutes(minutes);
        console.log(`useTimeEntrySubmit - Rounded duration: ${Math.floor(roundedDurationMinutes / 60)}h ${roundedDurationMinutes % 60}m (${roundedDurationMinutes} minutes)`);
      }
      
      const timeEntryData: any = {
        client_id: values.clientId,
        product_id: values.productId,
        description: values.description,
      };
      
      // Always set custom_price in the data object
      // This ensures it's explicitly included in the update
      timeEntryData.custom_price = values.customPrice;
      
      console.log("useTimeEntrySubmit - Custom price value being saved:", values.customPrice);

      if (values.productType === "activity") {
        // Store the EXACT times as entered by the user with preserved date
        timeEntryData.start_time = startTime;
        timeEntryData.end_time = endTime;
        timeEntryData.original_start_time = originalStartTime;
        timeEntryData.original_end_time = originalEndTime;
        timeEntryData.rounded_duration_minutes = roundedDurationMinutes;
        timeEntryData.quantity = null;
      } else if (values.productType === "item") {
        timeEntryData.quantity = values.quantity;
        timeEntryData.start_time = null;
        timeEntryData.end_time = null;
        timeEntryData.original_start_time = null;
        timeEntryData.original_end_time = null;
        timeEntryData.rounded_duration_minutes = null;
      }
      
      console.log("useTimeEntrySubmit - Updating time entry with data:", timeEntryData);
      console.log("useTimeEntrySubmit - Time entry ID:", timeEntry.id);

      const { error } = await supabase
        .from("time_entries")
        .update(timeEntryData)
        .eq("id", timeEntry.id);

      if (error) {
        console.error("useTimeEntrySubmit - Error from Supabase:", error);
        throw new Error(error.message);
      }
      
      console.log("useTimeEntrySubmit - Update successful");
      
      toast.success("Time entry updated successfully");
      onSuccess(); 
    } catch (error: any) {
      console.error("useTimeEntrySubmit - Error updating time entry:", error);
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
