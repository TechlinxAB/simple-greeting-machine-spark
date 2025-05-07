
import { useState } from "react";
import { format, differenceInMinutes } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { UseFormReturn } from "react-hook-form";
import { useTimeCalculation } from "./useTimeCalculation";

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
        // Store exact, unrounded times
        const startTimeIsoString = `${datePart}T${startTimeString}:00`;
        originalStartTime = startTimeIsoString;
        startTime = startTimeIsoString; // Store exact time as entered
        console.log("Start time (exact):", startTimeIsoString);
      }
      
      // Process end time if activity type
      if (endTimeString && values.productType === "activity") {
        // Store exact, unrounded end time
        const endTimeIsoString = `${datePart}T${endTimeString}:00`;
        originalEndTime = endTimeIsoString;
        endTime = endTimeIsoString; // Store exact time as entered
        console.log("End time (exact):", endTimeIsoString);
      }
      
      // Validate times for day crossing (when end time is earlier than start time)
      if (startTime && endTime) {
        const startDate = new Date(startTime);
        let endDateTime = new Date(endTime);
        
        // Log durations at different stages
        console.log("Final duration calculation:");
        let minutes = differenceInMinutes(endDateTime, startDate);
        console.log(`- Start: ${format(startDate, "HH:mm")}, End: ${format(endDateTime, "HH:mm")}`);
        console.log(`- Duration: ${Math.floor(minutes / 60)}h ${minutes % 60}m (${minutes} minutes)`);
        
        // Handle day crossing (when end time is earlier than start time)
        if (endDateTime < startDate) {
          console.log("End time is before start time, adjusting to next day");
          const nextDay = new Date(endTime);
          nextDay.setDate(nextDay.getDate() + 1);
          endTime = nextDay.toISOString();
          endDateTime = nextDay;
          
          // Log after day adjustment
          minutes = differenceInMinutes(endDateTime, startDate);
          console.log("After day crossing adjustment:");
          console.log(`- Start: ${format(startDate, "HH:mm")}, End: ${format(endDateTime, "HH:mm")}`);
          console.log(`- Duration: ${Math.floor(minutes / 60)}h ${minutes % 60}m (${minutes} minutes)`);
        }
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
        // Store the EXACT times as entered by the user
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
