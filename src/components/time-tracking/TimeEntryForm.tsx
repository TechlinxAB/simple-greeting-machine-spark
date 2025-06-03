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
import { differenceInMinutes, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TimePicker } from "./TimePicker";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils"; 
import { useIsLaptop } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/formatCurrency";
import { roundDurationMinutes } from "@/lib/formatTime";

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
  if (product?.type === "product") {
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
        toast.error(t("errors.somethingWentWrong"));
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

  // Add handler functions for TimePicker onComplete callbacks
  const handleStartTimeComplete = () => {
    // Focus on the end time field after start time is completed
    if (endTimeRef.current) {
      const input = endTimeRef.current.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  };

  const handleEndTimeComplete = () => {
    // Focus on the description field after end time is completed
    if (descriptionRef.current) {
      descriptionRef.current.focus();
    }
  };

  const onSubmit = async (values: TimeEntryFormValues) => {
    if (!user) {
      toast.error(t("errors.unauthorized"));
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
    } else if (product.type === "product") {
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
        let rawDurationMinutes = differenceInMinutes(adjustedEndTime, adjustedStartTime);
        console.log(`Raw duration before rounding: ${Math.floor(rawDurationMinutes / 60)}h ${rawDurationMinutes % 60}m (${rawDurationMinutes} minutes)`);
        
        // If end time is earlier than start time, assume it's the next day
        if (adjustedEndTime < adjustedStartTime) {
          console.log("End time is before start time, adjusting to next day");
          adjustedEndTime.setDate(adjustedEndTime.getDate() + 1);
          rawDurationMinutes = differenceInMinutes(adjustedEndTime, adjustedStartTime);
        }
        
        // Store original times directly in the database
        timeEntryData.original_start_time = adjustedStartTime.toISOString();
        timeEntryData.original_end_time = adjustedEndTime.toISOString();
        
        // Store the exact times in start_time and end_time as well
        timeEntryData.start_time = adjustedStartTime.toISOString();
        timeEntryData.end_time = adjustedEndTime.toISOString();
        
        // Calculate the rounded duration (for reporting/billing only)
        const roundedDurationMinutes = roundDurationMinutes(rawDurationMinutes);
        console.log(`Rounded duration: ${Math.floor(roundedDurationMinutes / 60)}h ${roundedDurationMinutes % 60}m (${roundedDurationMinutes} minutes)`);
        
        // Store the rounded duration in minutes for billing purposes
        timeEntryData.rounded_duration_minutes = roundedDurationMinutes;
        
        // Log the final times and durations being stored
        console.log("Final data being stored:");
        console.log("- start_time:", timeEntryData.start_time);
        console.log("- end_time:", timeEntryData.end_time);
        console.log("- original_start_time:", timeEntryData.original_start_time);
        console.log("- original_end_time:", timeEntryData.original_end_time);
        console.log("- rounded_duration_minutes:", timeEntryData.rounded_duration_minutes);
      } else if (product.type === "product" && values.quantity) {
        timeEntryData.quantity = values.quantity;
        timeEntryData.start_time = null;
        timeEntryData.end_time = null;
        timeEntryData.original_start_time = null;
        timeEntryData.original_end_time = null;
        timeEntryData.rounded_duration_minutes = null;
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

      toast.success(t("success.created"));
      onSuccess();
    } catch (error: any) {
      console.error("Error saving time entry:", error);
      toast.error(error.message || t("errors.somethingWentWrong"));
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
    
    if (product.type === "product") {
      return (
        <>
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common.quantity")}</FormLabel>
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
      // Apply rounding to the calculated duration (for display only)
      const roundedMinutes = roundDurationMinutes(minutes);
      const hours = Math.floor(roundedMinutes / 60);
      const remainingMinutes = roundedMinutes % 60;
      
      if (minutes !== roundedMinutes) {
        const actualHours = Math.floor(minutes / 60);
        const actualMinutes = minutes % 60;
        return `${actualHours}h ${actualMinutes}m → ${hours}h ${remainingMinutes}m (rounded)`;
      }
      
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
                  <FormLabel>{t("timeTracking.activityProduct")}:</FormLabel>
                  <Select
                    value={selectedProductType}
                    onValueChange={setSelectedProductType}
                  >
                    <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
                      <SelectValue placeholder={t("products.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity" className={compact ? "text-xs" : ""}>{t("products.activity")}</SelectItem>
                      <SelectItem value="product" className={compact ? "text-xs" : ""}>{t("products.product")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {watchClientId && (
                <div>
                  <FormLabel>{t("timeTracking.whatProduct")} {selectedProductType === "activity" ? t("products.activity").toLowerCase() : t("products.product").toLowerCase()}:</FormLabel>
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
                                  : t("timeTracking.selectProduct")
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
              
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        ref={(el) => {
                          descriptionRef.current = el;
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
                    {t("common.save")}...
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
