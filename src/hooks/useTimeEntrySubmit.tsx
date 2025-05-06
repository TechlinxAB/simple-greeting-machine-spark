
import { useState } from "react";
import { format } from "date-fns";
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
  
  // We set disableRounding to true specifically for editing
  const {
    applyTimeRounding,
    ensureMinimumDuration
  } = useTimeCalculation({
    watch: form.watch,
    startTimeRef,
    endTimeRef,
    disableRounding: true // Disable rounding for editing
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
      
      // Process start time if activity type
      if (startTimeString && values.productType === "activity") {
        // Store original, unrounded time
        const startTimeIsoString = `${datePart}T${startTimeString}:00`;
        startTime = startTimeIsoString;
        originalStartTime = startTimeIsoString;
        
        console.log("Original start time:", startTimeIsoString);
      }
      
      // Process end time if activity type
      if (endTimeString && values.productType === "activity") {
        // Store original, unrounded time
        const endTimeIsoString = `${datePart}T${endTimeString}:00`;
        endTime = endTimeIsoString;
        originalEndTime = endTimeIsoString;
        
        console.log("Original end time:", endTimeIsoString);
        
        // Parse the time values for validation
        const startDate = startTime ? new Date(startTime) : null;
        const endDate = new Date(endTimeIsoString);
        
        // Handle day crossing (when end time is earlier than start time)
        if (startDate && endDate < startDate) {
          console.log("End time is before start time, adjusting to next day");
          const nextDay = new Date(endDate);
          nextDay.setDate(nextDay.getDate() + 1);
          endTime = nextDay.toISOString();
          originalEndTime = nextDay.toISOString();
        }
        
        // For editing, we're using EXACTLY what was entered - no automatic rounding
        // Only apply the minimum duration validation
        if (startDate && endDate >= startDate) {
          // Only ensure minimum duration, don't apply rounding
          const finalEndDate = ensureMinimumDuration(startDate, endDate);
          
          if (finalEndDate.getTime() !== endDate.getTime()) {
            console.log("End time adjusted for minimum duration from", endDate, "to", finalEndDate);
            endTime = finalEndDate.toISOString();
            originalEndTime = finalEndDate.toISOString();
          }
        }
      }
      
      // Final validation check to prevent impossible time combinations
      if (startTime && endTime) {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        
        console.log("Final validation - Start:", startDate, "End:", endDate);
        
        if (endDate < startDate) {
          console.error("End time is still before start time after adjustments");
          throw new Error("End time cannot be before start time");
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
