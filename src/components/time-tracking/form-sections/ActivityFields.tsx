
import { useRef } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TimePicker } from "@/components/time-tracking/TimePicker";
import { useTimeCalculation } from "@/hooks/useTimeCalculation";
import { useTranslation } from "react-i18next";
import { minutesToHoursAndMinutes } from "@/lib/formatTime";

interface ActivityFieldsProps {
  form: any;
  loading: boolean;
  isCompact?: boolean;
  selectedProductPrice: number | null;
  isEditing?: boolean;
}

export function ActivityFields({ 
  form, 
  loading, 
  isCompact, 
  selectedProductPrice, 
  isEditing = false 
}: ActivityFieldsProps) {
  const { t } = useTranslation();
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  
  const {
    startTimeDate,
    endTimeDate,
    calculatedDuration,
    actualMinutes,
    roundedMinutes,
    handleTimeChange
  } = useTimeCalculation({ 
    watch: form.watch,
    startTimeRef,
    endTimeRef,
    disableRounding: isEditing // Disable rounding when editing
  });

  // Generate display for actual vs rounded duration
  const getDurationDisplayText = () => {
    if (actualMinutes === null || roundedMinutes === null) return null;
    
    if (isEditing) {
      return calculatedDuration; // When editing, just show the actual duration
    }
    
    // For new entries, show both the actual and the rounded duration
    const actual = minutesToHoursAndMinutes(actualMinutes);
    const rounded = minutesToHoursAndMinutes(roundedMinutes);
    
    const actualText = `${actual.hours}h ${actual.minutes}m`;
    const roundedText = `${rounded.hours}h ${rounded.minutes}m`;
    
    // If they're the same, just show one
    if (actualMinutes === roundedMinutes) {
      return calculatedDuration;
    }
    
    return `${actualText} → ${roundedText}`;
  };

  // Log when time values change to track rounding
  const logTimeChanges = (field: string, date: Date | null, timeString: string) => {
    if (date) {
      console.log(`ActivityFields: ${field} changed to ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')} (${timeString})`);
    }
    return timeString;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("timeTracking.startTime")}</FormLabel>
              <FormControl>
                <TimePicker 
                  value={startTimeDate} 
                  onChange={(date) => {
                    const timeString = handleTimeChange("startTime", date);
                    const finalTimeString = logTimeChanges("startTime", date, timeString || "");
                    form.setValue("startTime", finalTimeString);
                  }}
                  ref={startTimeRef}
                  disabled={loading}
                  roundOnBlur={false} // Never round individual times
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("timeTracking.endTime")}</FormLabel>
              <FormControl>
                <TimePicker 
                  value={endTimeDate} 
                  onChange={(date) => {
                    const timeString = handleTimeChange("endTime", date);
                    const finalTimeString = logTimeChanges("endTime", date, timeString || "");
                    form.setValue("endTime", finalTimeString);
                  }}
                  ref={endTimeRef}
                  disabled={loading}
                  roundOnBlur={false} // Never round individual times
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      {calculatedDuration && (
        <div className="text-sm text-muted-foreground">
          {t("timeTracking.duration")}: {getDurationDisplayText()}
          {!isEditing && roundedMinutes !== actualMinutes && (
            <span className="ml-2 text-xs">
              ({t("timeTracking.actualTimeWillBeRounded")})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
