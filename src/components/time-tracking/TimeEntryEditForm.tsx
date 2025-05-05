
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/time-tracking/TimePicker";
import { Loader2 } from "lucide-react";
import { format, parse, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsLaptop } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  clientId: z.string().uuid("Please select a client"),
  productId: z.string().uuid("Please select a product or activity"),
  description: z.string().optional(),
  quantity: z.coerce.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  customPrice: z.number().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface TimeEntryEditFormProps {
  timeEntry: any;
  onSuccess: () => void;
  onCancel: () => void;
  isCompact?: boolean;
}

export function TimeEntryEditForm({ timeEntry, onSuccess, onCancel, isCompact }: TimeEntryEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const [selectedProductPrice, setSelectedProductPrice] = useState<number | null>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const autoIsLaptop = useIsLaptop();
  const { t } = useTranslation();
  
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);
  const [calculatedDuration, setCalculatedDuration] = useState<string | null>(null);

  // Use the original times for display if available, otherwise fall back to rounded times
  const displayStartTime = timeEntry?.original_start_time || timeEntry?.start_time;
  const displayEndTime = timeEntry?.original_end_time || timeEntry?.end_time;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: timeEntry?.client_id || "",
      productId: timeEntry?.product_id || "",
      description: timeEntry?.description || "",
      quantity: timeEntry?.quantity || undefined,
      startTime: displayStartTime 
        ? format(new Date(displayStartTime), "HH:mm") 
        : undefined,
      endTime: displayEndTime 
        ? format(new Date(displayEndTime), "HH:mm") 
        : undefined,
      customPrice: timeEntry?.custom_price || null,
    },
  });

  // Update duration when times change
  useEffect(() => {
    const updateDuration = () => {
      const startTimeValue = form.watch("startTime");
      const endTimeValue = form.watch("endTime");
      
      if (startTimeValue && endTimeValue) {
        try {
          const today = new Date();
          const [startHours, startMinutes] = startTimeValue.split(":");
          const [endHours, endMinutes] = endTimeValue.split(":");
          
          const startDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            Number(startHours),
            Number(startMinutes)
          );
          
          const endDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            Number(endHours),
            Number(endMinutes)
          );
          
          // If end time is earlier than start time, assume it's the next day
          if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
          }
          
          const minutes = differenceInMinutes(endDate, startDate);
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          
          setCalculatedDuration(`${hours}h ${remainingMinutes}m`);
          setStartTimeDate(startDate);
          setEndTimeDate(endDate);
        } catch (error) {
          console.error("Error calculating duration:", error);
          setCalculatedDuration(null);
        }
      } else {
        setCalculatedDuration(null);
      }
    };
    
    updateDuration();
    
    // Set up a subscription to the form values
    const subscription = form.watch((value, { name }) => {
      if (name === "startTime" || name === "endTime") {
        updateDuration();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, form.watch]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
        
      if (error) throw error;
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, type, price")
        .order("name");
        
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const productId = form.watch("productId");
    if (productId) {
      const selectedProduct = products.find(p => p.id === productId);
      if (selectedProduct) {
        setSelectedProductType(selectedProduct.type);
        setSelectedProductPrice(selectedProduct.price);
      }
    } else if (timeEntry?.products?.type) {
      setSelectedProductType(timeEntry.products.type);
      setSelectedProductPrice(timeEntry.products.price);
    }
  }, [form.watch("productId"), products, timeEntry]);

  const handleTimeChange = (field: string, value: Date | null) => {
    if (value) {
      const timeString = format(value, "HH:mm");
      form.setValue(field as "startTime" | "endTime", timeString);
    } else {
      form.setValue(field as "startTime" | "endTime", undefined);
    }
  };

  /**
   * Rounds a date to the next 15-minute interval based on minutes:
   * - 0-15 minutes: Round to 15 minutes
   * - 16-30 minutes: Round to 30 minutes
   * - 31-45 minutes: Round to 45 minutes
   * - 46-59 minutes: Round to the next hour
   */
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

  // Function to ensure minimum 15-minute duration
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

  const onSubmit = async (values: FormValues) => {
    console.log("Form values:", values);
    
    try {
      setLoading(true);
      
      let startTimeString = values.startTime;
      let endTimeString = values.endTime;
      
      if (startTimeRef.current?.value) {
        startTimeString = startTimeRef.current.value;
      }
      
      if (endTimeRef.current?.value) {
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
      
      if (startTimeString && selectedProductType === "activity") {
        const startTimeIsoString = `${datePart}T${startTimeString}:00`;
        startTime = startTimeIsoString;
        originalStartTime = startTimeIsoString;
      }
      
      if (endTimeString && selectedProductType === "activity") {
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

      if (selectedProductType === "activity") {
        timeEntryData.start_time = startTime;
        timeEntryData.end_time = endTime;
        timeEntryData.original_start_time = originalStartTime;
        timeEntryData.original_end_time = originalEndTime;
        timeEntryData.quantity = null;
      } else if (selectedProductType === "item") {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", compact ? "text-sm" : "")}>
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={compact ? "text-sm" : ""}>Client</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={loading}
              >
                <FormControl>
                  <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id} className={compact ? "text-xs" : ""}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className={compact ? "text-xs" : ""} />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={compact ? "text-sm" : ""}>Product or Activity</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  const selectedProduct = products.find(p => p.id === value);
                  if (selectedProduct) {
                    setSelectedProductType(selectedProduct.type);
                    setSelectedProductPrice(selectedProduct.price);
                  }
                }} 
                defaultValue={field.value}
                disabled={loading}
              >
                <FormControl>
                  <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id} className={compact ? "text-xs" : ""}>
                      {product.name} ({product.type}) - {product.price} SEK
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className={compact ? "text-xs" : ""} />
            </FormItem>
          )}
        />
        
        {selectedProductType === "activity" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <TimePicker 
                        value={startTimeDate} 
                        onChange={(date) => handleTimeChange("startTime", date)}
                        ref={startTimeRef}
                        disabled={loading}
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
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <TimePicker 
                        value={endTimeDate} 
                        onChange={(date) => handleTimeChange("endTime", date)}
                        ref={endTimeRef}
                        disabled={loading}
                        roundOnBlur={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {calculatedDuration && (
              <div className="text-sm text-muted-foreground">
                Duration: {calculatedDuration}
                <span className="ml-2 text-xs">
                  (Actual time, will be rounded when saved)
                </span>
              </div>
            )}
          </div>
        )}
        
        {selectedProductType === "item" && (
          <>
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      step="1"
                      {...field} 
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      className={compact ? "h-8 text-xs" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={compact ? "text-sm" : ""}>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter a description..."
                  className={cn("resize-none", compact ? "text-xs" : "")}
                  {...field} 
                  disabled={loading}
                />
              </FormControl>
              <FormMessage className={compact ? "text-xs" : ""} />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
            className={compact ? "h-8 text-xs px-3" : ""}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className={compact ? "h-8 text-xs px-3" : ""}
          >
            {loading && <Loader2 className={cn("mr-2 animate-spin", compact ? "h-3 w-3" : "h-4 w-4")} />}
            Update Time Entry
          </Button>
        </div>
      </form>
    </Form>
  );
}
