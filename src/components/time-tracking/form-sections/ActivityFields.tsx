
import { useRef } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TimePicker } from "@/components/time-tracking/TimePicker";
import { Input } from "@/components/ui/input";
import { useTimeCalculation } from "@/hooks/useTimeCalculation";
import { useTranslation } from "react-i18next";

interface ActivityFieldsProps {
  form: any;
  loading: boolean;
  isCompact?: boolean;
  selectedProductPrice: number | null;
  isEditing?: boolean;
}

export function ActivityFields({ form, loading, isCompact, selectedProductPrice, isEditing = false }: ActivityFieldsProps) {
  const { t } = useTranslation();
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  
  const {
    startTimeDate,
    endTimeDate,
    calculatedDuration,
    handleTimeChange
  } = useTimeCalculation({ 
    watch: form.watch,
    startTimeRef,
    endTimeRef,
    disableRounding: isEditing // Disable rounding when editing
  });

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
                    form.setValue("startTime", timeString);
                  }}
                  ref={startTimeRef}
                  disabled={loading}
                  roundOnBlur={!isEditing} // Only round if not editing
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
                    form.setValue("endTime", timeString);
                  }}
                  ref={endTimeRef}
                  disabled={loading}
                  roundOnBlur={!isEditing} // Only round if not editing
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      {calculatedDuration && (
        <div className="text-sm text-muted-foreground">
          {t("timeTracking.duration")}: {calculatedDuration}
          {!isEditing && (
            <span className="ml-2 text-xs">
              ({t("timeTracking.actualTimeWillBeRounded")})
            </span>
          )}
        </div>
      )}
      
      {/* Custom price field for activity */}
      <FormField
        control={form.control}
        name="customPrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("products.customPrice")} ({t("products.defaultPrice")}: {selectedProductPrice})</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={selectedProductPrice?.toString()}
                {...field}
                value={field.value === null ? '' : field.value}
                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                disabled={loading}
                className={isCompact ? "h-8 text-xs" : ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
