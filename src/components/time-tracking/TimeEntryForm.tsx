
import { useState, useEffect, useRef } from "react";
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

let filteredProducts: any[] = [];

const timeEntrySchema = z.object({
  clientId: z.string({ required_error: "Client is required" }),
  productId: z.string({ required_error: "Product or activity is required" }),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  quantity: z.number().optional(),
  description: z.string().optional(),
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
  const autoIsLaptop = useIsLaptop();
  const { t } = useTranslation();
  
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  const endTimeRef = useRef<HTMLDivElement>(null);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      clientId: "",
      productId: "",
      description: "",
    },
    mode: "onSubmit"
  });

  const watchProductId = form.watch("productId");
  const watchClientId = form.watch("clientId");

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
      if (currentProduct && currentProduct.type !== selectedProductType) {
        form.setValue("productId", "");
      }
    }
  }, [selectedProductType, products, form, watchProductId]);

  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
  };

  const applyTimeRounding = (time: Date | undefined): Date | undefined => {
    if (!time) return undefined;
    
    const hours = time.getHours();
    const minutes = time.getMinutes();
    
    const remainder = minutes % 15;
    let roundedMinutes: number;
    
    if (remainder === 0) {
      roundedMinutes = minutes;
    } else {
      roundedMinutes = minutes + (15 - remainder);
      if (roundedMinutes >= 60) {
        return new Date(
          time.getFullYear(),
          time.getMonth(),
          time.getDate(),
          (hours + 1) % 24,
          roundedMinutes - 60
        );
      }
    }
    
    return new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      hours,
      roundedMinutes
    );
  };

  const handleStartTimeComplete = () => {
    if (endTimeRef.current) {
      const input = endTimeRef.current.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  };

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

      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const selectedDay = selectedDate.getDate();

      if (product.type === "activity" && values.startTime && values.endTime) {
        const adjustedStartTime = new Date(values.startTime);
        adjustedStartTime.setFullYear(selectedYear, selectedMonth, selectedDay);
        
        const adjustedEndTime = new Date(values.endTime);
        adjustedEndTime.setFullYear(selectedYear, selectedMonth, selectedDay);
        
        if (adjustedEndTime < adjustedStartTime) {
          adjustedEndTime.setDate(adjustedEndTime.getDate() + 1);
        }
        
        const roundedStartTime = applyTimeRounding(adjustedStartTime);
        const roundedEndTime = applyTimeRounding(adjustedEndTime);
        
        if (roundedStartTime && roundedEndTime) {
          timeEntryData.start_time = roundedStartTime.toISOString();
          timeEntryData.end_time = roundedEndTime.toISOString();
        }
      } else if (product.type === "item" && values.quantity) {
        timeEntryData.quantity = values.quantity;
      }

      const createdAtDate = new Date(selectedYear, selectedMonth, selectedDay);
      timeEntryData.created_at = createdAtDate.toISOString();

      const { error } = await supabase
        .from("time_entries")
        .insert(timeEntryData);

      if (error) throw error;

      form.reset({
        clientId: values.clientId,
        productId: "",
        description: "",
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      );
    }
    
    if (product.type === "item") {
      return (
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
      );
    }
    
    return null;
  };

  const calculateDuration = () => {
    const startTime = form.getValues("startTime");
    const endTime = form.getValues("endTime");
    
    if (startTime && endTime) {
      const minutes = differenceInMinutes(endTime, startTime);
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
                                  {product.name}
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
              
              {form.getValues("startTime") && form.getValues("endTime") && (
                <div className="text-sm text-muted-foreground">
                  {t("timeTracking.duration")}: {calculateDuration()}
                </div>
              )}
              
              <div>
                <FormLabel>{t("timeTracking.description")}</FormLabel>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={t("timeTracking.descriptionPlaceholder")}
                          className={cn("min-h-[100px]", compact ? "text-xs" : "")}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
                  t("timeTracking.saveTimer")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
