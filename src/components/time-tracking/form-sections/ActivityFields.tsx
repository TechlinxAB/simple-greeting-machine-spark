
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
import { Input } from "@/components/ui/input";

interface ActivityFieldsProps {
  form: any;
  loading: boolean;
  isCompact?: boolean;
  selectedProductPrice: number | null;
  isEditing?: boolean;
  showCustomPrice?: boolean;
}

export function ActivityFields({ 
  form, 
  loading, 
  isCompact, 
  selectedProductPrice, 
  isEditing = false,
  showCustomPrice = true
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
    disableRounding: false // Always apply rounding rules, even when editing
  });

  // Generate display for actual vs rounded duration
  const getDurationDisplayText = () => {
    if (actualMinutes === null || roundedMinutes === null) return null;
    
    // For both new entries and editing, show both the actual and the rounded duration if they differ
    const actual = minutesToHoursAndMinutes(actualMinutes);
    const rounded = minutesToHoursAndMinutes(roundedMinutes);
    
    const actualText = `${actual.hours}h ${actual.minutes}m`;
    const roundedText = `${rounded.hours}h ${rounded.minutes}m`;
    
    // If they're the same, just show one
    if (actualMinutes === roundedMinutes) {
      return actualText;
    }
    
    return (
      <>
        <span className="text-muted-foreground">{actualText}</span>
        <span className="font-medium text-primary"> → {roundedText}</span>
        <span className="ml-1 text-xs text-muted-foreground">({t("timeTracking.billingDuration")})</span>
      </>
    );
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
        <div className="text-sm border rounded-md p-3 bg-muted/30">
          <div className="flex items-center">
            <span className="font-medium mr-2">{t("timeTracking.actualDuration")}:</span>
            <div>
              {getDurationDisplayText()}
            </div>
          </div>
          {roundedMinutes !== actualMinutes && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("timeTracking.roundingAppliedExplanation")}
            </p>
          )}
        </div>
      )}

      {showCustomPrice && (
        <FormField
          control={form.control}
          name="customPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isCompact ? "text-sm" : ""}>
                {t("products.customPrice")} 
                {selectedProductPrice !== null && (
                  <span className="ml-1 text-muted-foreground">
                    ({t("products.defaultPrice")}: {selectedProductPrice})
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={selectedProductPrice?.toString()}
                  {...field}
                  value={field.value === null ? '' : field.value}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  className={isCompact ? "h-8 text-xs" : ""}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage className={isCompact ? "text-xs" : ""} />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
