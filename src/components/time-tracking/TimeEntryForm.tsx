import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { differenceInMinutes } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TimePicker } from "./TimePicker";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils"; 
import { useIsLaptop } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/formatCurrency";

let filteredProducts: any[] = [];

const timeEntrySchema = z.object({
  clientId: z.string({ required_error: "Client is required" }),
  productId: z.string({ required_error: "Product or activity is required" }),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  quantity: z.number().optional(),
  description: z.string().optional(),
  customPrice: z.number().optional().nullable(),
}).refine((data) => {
  const product = filteredProducts.find(p => p.id === data.productId);
  if (product?.type === "activity") {
    return data.startTime !== undefined && data.endTime !== undefined;
  }
  if (product?.type === "item") {
    return data.quantity !== undefined && data.quantity > 0;
  }
  return true;
}, {
  message: "Both start and end times are required for activities",
  path: ["endTime"]
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

interface TimeEntryFormProps {
  selectedDate: Date;
  onSuccess: () => void;
  isCompact?: boolean;
}

export function TimeEntryForm({ selectedDate, onSuccess, isCompact }: TimeEntryFormProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>("activity");
  const [filteredProductsList, setFilteredProductsList] = useState<any[]>([]);
  const [selectedProductPrice, setSelectedProductPrice] = useState<number | null>(null);
  const autoIsLaptop = useIsLaptop();
  const { t } = useTranslation();
  
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  const endTimeRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      clientId: "",
      productId: "",
      description: "",
      customPrice: null,
    },
    mode: "onSubmit"
  });

  const watchProductId = form.watch("productId");
  const watchClientId = form.watch("clientId");
  const watchStartTime = form.watch("startTime");
  const watchEndTime = form.watch("endTime");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name")
          .order("name");

        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, name, type, price")
          .order("name");

        if (productsError) throw productsError;
        setProducts(productsData || []);
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
        toast.error(t("error.somethingWentWrong"));
      }
    };

    fetchData();
  }, [t]);

  useEffect(() => {
    const filtered = products.filter(product => product.type === selectedProductType);
    setFilteredProductsList(filtered);
    filteredProducts = filtered;
    
    if (watchProductId) {
      const currentProduct = products.find(p => p.id === watchProductId);
      if (currentProduct) {
        if (currentProduct.type !== selectedProductType) {
          form.setValue("productId", "");
          setSelectedProductPrice(null);
        } else {
          setSelectedProductPrice(currentProduct.price);
        }
      }
    }
  }, [selectedProductType, products, form, watchProductId]);

  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
  };

  /**
   * Rounds a date to the correct interval based on minutes following these exact rules:
   * - 0 minutes: No rounding
   * - 1-15 minutes: Round to 15 minutes
   * - 16-30 minutes: Round to 30 minutes
   * - 31-45 minutes: Round to 45 minutes
   * - 46-59 minutes: Round to the next hour
   */
  const applyTimeRounding = (time: Date | undefined): Date | undefined => {
    if (!time) return undefined;
    
    const hours = time.getHours();
    const minutes = time.getMinutes();
    
    // If minutes is exactly 0, don't round
    if (minutes === 0) {
      console.log(`Time rounding: ${hours}:${minutes} → NO ROUNDING (exactly 0 minutes)`);
      return new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate(),
        hours,
        0
      );
    }
    
    let roundedMinutes: number;
    let roundedHours = hours;
    
    // Apply the correct rounding rules
    if (minutes >= 1 && minutes <= 15) {
      roundedMinutes = 15;
    } else if (minutes >= 16 && minutes <= 30) {
      roundedMinutes = 30;
    } else if (minutes >= 31 && minutes <= 45) {
      roundedMinutes = 45;
    } else {
      // If minutes > 45, round to the next hour
      roundedMinutes = 0;
      roundedHours = (hours + 1) % 24;
    }
    
    console.log(`Time rounding: ${hours}:${minutes.toString().padStart(2, '0')} → ${roundedHours}:${roundedMinutes.toString().padStart(2, '0')}`);
    
    return new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      roundedHours,
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

  // Function to handle start time completion
  const handleStartTimeComplete = useCallback(() => {
    console.log("Start time complete, focusing end time field");
    if (endTimeRef.current) {
      const input = endTimeRef.current.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  }, []);

  // Function to handle end time completion
  const handleEndTimeComplete = useCallback(() => {
    console.log("End time complete, focusing description field");
    
    console.log("Description ref:", descriptionRef.current);
    
    requestAnimationFrame(() => {
      const focusDescription = () => {
        if (!isMounted.current) return;
        
        const textarea = document.getElementById('description-field');
        if (textarea) {
          console.log("Found description field by ID:", textarea);
          (textarea as HTMLTextAreaElement).focus();
          textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return;
        }
        
        if (descriptionRef.current) {
          console.log("Focusing description field via ref");
          descriptionRef.current.focus();
          descriptionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          console.log("Description field ref is null, will retry");
          setTimeout(() => {
            if (!isMounted.current) return;
            
            const retryTextarea = document.getElementById('description-field');
            if (retryTextarea) {
              console.log("Found description field on retry");
              (retryTextarea as HTMLTextAreaElement).focus();
              retryTextarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
              console.log("Failed to find description field after retries");
            }
          }, 100);
        }
      };
      
      setTimeout(focusDescription, 100);
    });
  }, []);

  const onSubmit = async (values: TimeEntryFormValues) => {
    if (!user) {
      toast.error(t("error.sessionExpired"));
      return;
    }

    const product = getProductById(values.productId);
    if (!product) {
      toast.error(t("timeTracking.productRequired"));
      return;
    }

    if (product.type === "activity") {
      if (!values.startTime || !values.endTime) {
        toast.error(t("timeTracking.timeRequired"));
        return;
      }
    } else if (product.type === "item") {
      if (!values.quantity || values.quantity <= 0) {
        toast.error(t("timeTracking.quantityRequired"));
        return;
      }
    }

    setIsLoading(true);
    try {
      const timeEntryData: any = {
        client_id: values.clientId,
        product_id: values.productId,
        user_id: user.id,
        description: values.description || null,
      };
      
      // Always set custom_price whether it's null or has a value
      // This ensures it's explicitly set in all cases
      timeEntryData.custom_price = values.customPrice;
      
      console.log("Custom price being saved:", values.customPrice);

      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const selectedDay = selectedDate.getDate();

      if (product.type === "activity") {
        const adjustedStartTime = new Date(values.startTime);
        adjustedStartTime.setFullYear(selectedYear, selectedMonth, selectedDay);
        
        const adjustedEndTime = new Date(values.endTime);
        adjustedEndTime.setFullYear(selectedYear, selectedMonth, selectedDay);
        
        // Log original times for debugging
        console.log("Original time input - Start:", 
          `${adjustedStartTime.getHours()}:${adjustedStartTime.getMinutes().toString().padStart(2, '0')}`,
          "End:", 
          `${adjustedEndTime.getHours()}:${adjustedEndTime.getMinutes().toString().padStart(2, '0')}`
        );
        
        // Calculate the raw duration before any rounding
        const rawDurationMinutes = differenceInMinutes(adjustedEndTime, adjustedStartTime);
        console.log(`Raw duration before rounding: ${Math.floor(rawDurationMinutes / 60)}h ${rawDurationMinutes % 60}m (${rawDurationMinutes} minutes)`);
        
        if (adjustedEndTime < adjustedStartTime) {
          console.log("End time is before start time, adjusting to next day");
          adjustedEndTime.setDate(adjustedEndTime.getDate() + 1);
        }
        
        // Store original times before rounding
        timeEntryData.original_start_time = adjustedStartTime.toISOString();
        timeEntryData.original_end_time = adjustedEndTime.toISOString();
        
        // Apply rounding to both start and end times
        // For start time, we want to keep it as is (don't round)
        // For end time, we apply the rounding rules
        const roundedEndTime = applyTimeRounding(adjustedEndTime);
        
        // Ensure minimum duration of 15 minutes
        const finalEndTime = roundedEndTime 
          ? ensureMinimumDuration(adjustedStartTime, roundedEndTime) 
          : ensureMinimumDuration(adjustedStartTime, adjustedEndTime);
        
        // Log the final times after all adjustments
        console.log("Final times after rounding - Start:", 
          `${adjustedStartTime.getHours()}:${adjustedStartTime.getMinutes().toString().padStart(2, '0')}`,
          "End:", 
          `${finalEndTime.getHours()}:${finalEndTime.getMinutes().toString().padStart(2, '0')}`
        );
        
        // Calculate duration after rounding
        const finalDurationMinutes = differenceInMinutes(finalEndTime, adjustedStartTime);
        console.log(`Final duration after rounding: ${Math.floor(finalDurationMinutes / 60)}h ${finalDurationMinutes % 60}m (${finalDurationMinutes} minutes)`);
        
        timeEntryData.start_time = adjustedStartTime.toISOString();
        timeEntryData.end_time = finalEndTime.toISOString();
      } else if (product.type === "item" && values.quantity) {
        timeEntryData.quantity = values.quantity;
        timeEntryData.start_time = null;
        timeEntryData.end_time = null;
        timeEntryData.original_start_time = null;
        timeEntryData.original_end_time = null;
      }

      const createdAtDate = new Date(selectedYear, selectedMonth, selectedDay);
      timeEntryData.created_at = createdAtDate.toISOString();

      console.log("Saving time entry with data:", timeEntryData);

      const { error } = await supabase
        .from("time_entries")
        .insert(timeEntryData);

      if (error) throw error;

      const currentClientId = values.clientId;
      const currentProductId = values.productId;
      
      form.reset({
        clientId: currentClientId,
        productId: currentProductId,
        description: "",
        customPrice: null,
      });
      
      if (product.type === "activity") {
        form.setValue("startTime", undefined);
        form.setValue("endTime", undefined);
      } else {
        form.setValue("quantity", undefined);
      }

      toast.success(t("timeTracking.timeEntryAdded"));
      onSuccess();
    } catch (error: any) {
      console.error("Error saving time entry:", error);
      toast.error(error.message || t("timeTracking.timeEntryFailure"));
    } finally {
      setIsLoading(false);
    }
  };

  const renderProductSpecificFields = () => {
    const product = getProductById(watchProductId);
    
    if (!product) return null;
    
    if (product.type === "activity") {
      return (
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
                      onComplete={handleStartTimeComplete}
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
                <FormItem ref={endTimeRef}>
                  <FormLabel>{t("timeTracking.toTime")}:</FormLabel>
                  <FormControl>
                    <TimePicker 
                      value={field.value || null} 
                      onChange={field.onChange}
                      roundOnBlur={false}
                      onComplete={handleEndTimeComplete}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {watchStartTime && watchEndTime && (
            <div className="text-sm text-muted-foreground">
              {t("timeTracking.duration")}: {calculateDuration()}
            </div>
          )}
        </>
      );
    }
    
    if (product.type === "item") {
      return (
        <>
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
                    placeholder={t("timeTracking.quantityPlaceholder")}
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
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
                    className={compact ? "h-8 text-xs" : ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      );
    }
    
    return null;
  };

  const calculateDuration = () => {
    if (watchStartTime && watchEndTime) {
      const minutes = differenceInMinutes(watchEndTime, watchStartTime);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      return `${hours}h ${remainingMinutes}m`;
    }
    
    return null;
  };

  return (
    <Card>
      <CardHeader className={cn("pb-3", compact ? "pt-3" : "")}>
        <CardTitle className={cn("flex justify-between", compact ? "text-sm" : "")}>
          <span>{t("timeTracking.addTimeEntry")}</span>
          {isToday(selectedDate) && (
            <span className="text-sm bg-green-500 text-white px-3 py-1 rounded-md">{t("timeTracking.today")}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(compact ? "p-3" : "")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>{t("timeTracking.selectClient")}:</FormLabel>
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
                              <SelectValue placeholder={t("clients.selectClient")} />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id} className={compact ? "text-xs" : ""}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormLabel>{t("timeTracking.activityItem")}:</FormLabel>
                  <Select
                    value={selectedProductType}
                    onValueChange={setSelectedProductType}
                  >
                    <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
                      <SelectValue placeholder={t("products.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity" className={compact ? "text-xs" : ""}>{t("products.activity")}</SelectItem>
                      <SelectItem value="item" className={compact ? "text-xs" : ""}>{t("products.item")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {watchClientId && (
                <div>
                  <FormLabel>{t("timeTracking.whatProduct")} {selectedProductType === "activity" ? t("products.activity").toLowerCase() : t("products.item").toLowerCase()}:</FormLabel>
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("startTime", undefined);
                              form.setValue("endTime", undefined);
                              form.setValue("quantity", undefined);
                              
                              // Reset custom price when product changes
                              form.setValue("customPrice", null);
                              
                              // Set the selected product price
                              const selectedProduct = products.find(p => p.id === value);
                              if (selectedProduct) {
                                setSelectedProductPrice(selectedProduct.price);
                              }
                            }}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                selectedProductType === "activity" 
                                  ? t("timeTracking.selectActivity") 
                                  : t("timeTracking.selectItem")
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredProductsList.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - {formatCurrency(product.price)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {watchProductId && renderProductSpecificFields()}
              
              {watchStartTime && watchEndTime && (
                <div className="text-sm text-muted-foreground">
                  {t("timeTracking.duration")}: {calculateDuration()}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timeTracking.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        ref={(el) => {
                          descriptionRef.current = el;
                          console.log("Description ref attached:", el);
                        }}
                        placeholder={t("timeTracking.descriptionPlaceholder")}
                        className={cn("min-h-[100px]", compact ? "text-xs" : "")}
                        {...field}
                        value={field.value || ""}
                        id="description-field"
                        tabIndex={0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-green-500 hover:bg-green-600 mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.saving")}...
                  </>
                ) : (
                  t("timeTracking.saveTimeEntry")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
