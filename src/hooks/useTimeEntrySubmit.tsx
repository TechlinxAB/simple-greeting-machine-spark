
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
  
  const {
    applyTimeRounding,
    ensureMinimumDuration
  } = useTimeCalculation({
    watch: form.watch,
    startTimeRef,
    endTimeRef
  });

  const handleSubmit = async (values: any) => {
    console.log("Form values:", values);
    
    try {
      setLoading(true);
      
      let startTimeString = values.startTime;
      let endTimeString = values.endTime;
      
      if (startTimeRef?.current?.value) {
        startTimeString = startTimeRef.current.value;
      }
      
      if (endTimeRef?.current?.value) {
        endTimeString = endTimeRef.current.value;
      }
      
      console.log("Start time:", startTimeString);
      console.log("End time:", endTimeString);
      
      const timeEntryDate = timeEntry.created_at 
        ? new Date(timeEntry.created_at) 
        : new Date();
        
      const datePart = format(timeEntryDate, "yyyy-MM-dd");
      
      let startTime = null;
      let endTime = null;
      let originalStartTime = null;
      let originalEndTime = null;
      
      if (startTimeString && values.productType === "activity") {
        const startTimeIsoString = `${datePart}T${startTimeString}:00`;
        startTime = startTimeIsoString;
        originalStartTime = startTimeIsoString;
      }
      
      if (endTimeString && values.productType === "activity") {
        const endTimeIsoString = `${datePart}T${endTimeString}:00`;
        originalEndTime = endTimeIsoString;
        
        // Parse the time values
        const startDate = startTime ? new Date(startTime) : null;
        const endDate = new Date(endTimeIsoString);
        
        // Handle day crossing (when end time is earlier than start time)
        if (startDate && endDate < startDate) {
          const nextDay = new Date(endDate);
          nextDay.setDate(nextDay.getDate() + 1);
          endTime = nextDay.toISOString();
          originalEndTime = nextDay.toISOString();
        } else {
          // Apply rounding only to the end time
          if (startDate) {
            const roundedEndDate = applyTimeRounding(endDate);
            const finalEndDate = roundedEndDate 
              ? ensureMinimumDuration(startDate, roundedEndDate)
              : ensureMinimumDuration(startDate, endDate);
            
            endTime = finalEndDate.toISOString();
          } else {
            endTime = endTimeIsoString;
          }
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
