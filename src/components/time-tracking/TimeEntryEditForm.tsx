
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "./TimePicker";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const timeEntrySchema = z.object({
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  customPrice: z.number().optional().nullable(),
  quantity: z.number().optional(),
  description: z.string().optional(),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

interface TimeEntryEditFormProps {
  entry: any;  // Changed from timeEntry to entry for consistency
  onSuccess: () => void;
  onCancel: () => void;
  isCompact?: boolean;
}

export function TimeEntryEditForm({ entry, onSuccess, onCancel, isCompact }: TimeEntryEditFormProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProductPrice, setSelectedProductPrice] = useState<number | null>(null);

  useEffect(() => {
    // If the entry has a product, fetch its price for display
    const fetchProductPrice = async () => {
      if (entry.product_id) {
        try {
          const { data, error } = await supabase
            .from("products")
            .select("price")
            .eq("id", entry.product_id)
            .single();
          
          if (error) throw error;
          if (data) setSelectedProductPrice(data.price);
        } catch (error) {
          console.error("Error fetching product price:", error);
        }
      }
    };

    fetchProductPrice();
  }, [entry.product_id]);

  // Helper function to create a Date from a timestamp string
  const parseTimestamp = (timestamp: string | null): Date | undefined => {
    if (!timestamp) return undefined;
    try {
      return new Date(timestamp);
    } catch (error) {
      return undefined;
    }
  };

  // Use original times for editing if available, otherwise use the rounded times
  const originalStartTime = parseTimestamp(entry.original_start_time || entry.start_time);
  const originalEndTime = parseTimestamp(entry.original_end_time || entry.end_time);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      startTime: originalStartTime,
      endTime: originalEndTime,
      quantity: entry.quantity,
      description: entry.description || "",
      customPrice: entry.custom_price || null,
    },
  });

  const watchStartTime = form.watch("startTime");
  const watchEndTime = form.watch("endTime");

  // Round a date to the next 15-minute interval
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

  // Ensure minimum 15-minute duration
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

  // Calculate duration for display
  const calculateDuration = () => {
    if (watchStartTime && watchEndTime) {
      const diffMs = watchEndTime.getTime() - watchStartTime.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      
      return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
    }
    return null;
  };

  const onSubmit = async (values: TimeEntryFormValues) => {
    if (!user) {
      toast.error(t("error.sessionExpired"));
      return;
    }

    if (entry.products?.type === "activity" && (!values.startTime || !values.endTime)) {
      toast.error(t("timeTracking.timeRequired"));
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        description: values.description || null,
        custom_price: values.customPrice || null,
      };

      if (entry.products?.type === "activity" && values.startTime && values.endTime) {
        // Keep the date component but update time component
        const originalStartDate = new Date(entry.start_time || entry.original_start_time);
        const originalEndDate = new Date(entry.end_time || entry.original_end_time);
        
        const newStartTime = values.startTime;
        newStartTime.setFullYear(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
        
        const newEndTime = values.endTime;
        newEndTime.setFullYear(originalEndDate.getFullYear(), originalEndDate.getMonth(), originalEndDate.getDate());
        
        // Adjust if end time is before start time (likely means it crosses midnight)
        if (newEndTime < newStartTime) {
          newEndTime.setDate(newEndTime.getDate() + 1);
        }
        
        // Store original times without rounding
        updateData.original_start_time = newStartTime.toISOString();
        updateData.original_end_time = newEndTime.toISOString();
        
        // Only round the end time
        const roundedEndTime = applyTimeRounding(newEndTime);
        
        // Ensure minimum duration
        const finalEndTime = roundedEndTime 
          ? ensureMinimumDuration(newStartTime, roundedEndTime)
          : ensureMinimumDuration(newStartTime, newEndTime);
        
        updateData.start_time = newStartTime.toISOString();
        updateData.end_time = finalEndTime.toISOString();
      } else if (entry.products?.type === "item") {
        updateData.quantity = values.quantity;
      }

      const { error } = await supabase
        .from("time_entries")
        .update(updateData)
        .eq("id", entry.id);

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error("Error saving time entry:", error);
      toast.error(error.message || t("timeTracking.timeEntryFailure"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t("timeTracking.editTimeEntry")}</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <span className="font-medium">{t("clients.client")}:</span>
          <div>{entry.clients?.name || t("clients.unknownClient")}</div>
        </div>
        <div>
          <span className="font-medium">{t("products.product")}:</span>
          <div>{entry.products?.name || t("products.unknownProduct")}</div>
        </div>
        <div>
          <span className="font-medium">{t("products.type")}:</span>
          <div className="capitalize">{entry.products?.type || t("products.unknownType")}</div>
        </div>
        <div>
          <span className="font-medium">{t("timeTracking.createdAt")}:</span>
          <div>{format(new Date(entry.created_at), "PPP p")}</div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {entry.products?.type === "activity" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("timeTracking.fromTime")}:</FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value || null}
                          onChange={field.onChange}
                          roundOnBlur={false}
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
                      <FormLabel>{t("timeTracking.toTime")}:</FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value || null}
                          onChange={field.onChange}
                          roundOnBlur={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {watchStartTime && watchEndTime && (
                <div className="text-sm">
                  {t("timeTracking.duration")}: {calculateDuration()}
                </div>
              )}
            </>
          ) : entry.products?.type === "item" ? (
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("timeTracking.quantity")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name="customPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("timeTracking.customPrice")} ({t("common.optional")})</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={selectedProductPrice !== null ? selectedProductPrice.toString() : t("timeTracking.defaultPrice")}
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
                {selectedProductPrice !== null && (
                  <p className="text-xs text-muted-foreground">
                    {entry.products?.type === "activity" 
                      ? t("timeTracking.defaultActivityPrice") 
                      : t("timeTracking.defaultItemPrice")}: {selectedProductPrice} {t("common.currency")}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("timeTracking.description")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("timeTracking.descriptionPlaceholder")}
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving")}...
                </>
              ) : (
                t("common.save")
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
