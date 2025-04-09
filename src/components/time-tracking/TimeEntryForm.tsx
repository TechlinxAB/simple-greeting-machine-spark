
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { differenceInMinutes, addMinutes, roundToNearestMinutes } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateSelector } from "./DateSelector";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TimePicker } from "./TimePicker";

// Define the schema for time tracking form
const timeEntrySchema = z.object({
  clientId: z.string({ required_error: "Client is required" }),
  productId: z.string({ required_error: "Product or activity is required" }),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  quantity: z.number().optional(),
  description: z.string().optional(),
});

// Type for the time entry form values
type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

// Define props for TimeEntryForm component
interface TimeEntryFormProps {
  selectedDate: Date;
  onSuccess: () => void;
}

// Main TimeEntryForm component
export function TimeEntryForm({ selectedDate, onSuccess }: TimeEntryFormProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate);

  // Initialize form
  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      clientId: "",
      productId: "",
      description: "",
    },
  });

  const watchProductId = form.watch("productId");
  const watchClientId = form.watch("clientId");

  // Update currentDate when selectedDate changes
  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  // Fetch clients and products on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name")
          .order("name");

        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, name, type, price")
          .order("name");

        if (productsError) throw productsError;
        setProducts(productsData || []);
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
        toast.error("Failed to load clients and products");
      }
    };

    fetchData();
  }, []);

  // Filter products based on selected product type
  useEffect(() => {
    if (selectedProductType === "") {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.type === selectedProductType));
    }
  }, [selectedProductType, products]);

  // Handle date change
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  // Find product details by ID
  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
  };

  // Round time to 15-minute intervals
  const roundToNearestQuarter = (date: Date): Date => {
    return roundToNearestMinutes(date, { nearestTo: 15 });
  };

  // Submit handler for form
  const onSubmit = async (values: TimeEntryFormValues) => {
    if (!user) {
      toast.error("You must be logged in to track time");
      return;
    }

    const product = getProductById(values.productId);
    if (!product) {
      toast.error("Invalid product selected");
      return;
    }

    setIsLoading(true);
    try {
      // Prepare the time entry data based on product type
      const timeEntryData: any = {
        client_id: values.clientId,
        product_id: values.productId,
        user_id: user.id,
        description: values.description || null,
      };

      if (product.type === "activity" && values.startTime && values.endTime) {
        // Round times to nearest 15 minutes
        const roundedStartTime = roundToNearestQuarter(values.startTime);
        const roundedEndTime = roundToNearestQuarter(values.endTime);
        
        timeEntryData.start_time = roundedStartTime.toISOString();
        timeEntryData.end_time = roundedEndTime.toISOString();
      } else if (product.type === "item" && values.quantity) {
        timeEntryData.quantity = values.quantity;
      }

      // Insert the time entry
      const { error } = await supabase
        .from("time_entries")
        .insert(timeEntryData);

      if (error) throw error;

      // Reset form and show success message
      form.reset({
        clientId: values.clientId, // Keep the selected client
        productId: "",
        description: "",
      });
      
      if (product.type === "activity") {
        form.setValue("startTime", undefined);
        form.setValue("endTime", undefined);
      } else {
        form.setValue("quantity", undefined);
      }

      toast.success("Time entry saved successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Error saving time entry:", error);
      toast.error(error.message || "Failed to save time entry");
    } finally {
      setIsLoading(false);
    }
  };

  // Show different form fields based on selected product type
  const renderProductSpecificFields = () => {
    const product = getProductById(watchProductId);
    
    if (!product) return null;
    
    if (product.type === "activity") {
      return (
        <>
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <TimePicker 
                    value={field.value || null} 
                    onChange={field.onChange}
                    roundToMinutes={15}
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
                    value={field.value || null} 
                    onChange={field.onChange}
                    roundToMinutes={15}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      );
    }
    
    if (product.type === "item") {
      return (
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
                  placeholder="Enter quantity"
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

  // Calculate and display duration if both start and end times are set
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Time Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <DateSelector 
              selectedDate={currentDate} 
              onDateChange={handleDateChange} 
            />
            
            <div className="flex gap-4 mt-4">
              <Button
                type="button"
                variant={selectedProductType === "" ? "default" : "outline"}
                onClick={() => setSelectedProductType("")}
                className="flex-1"
              >
                All Products
              </Button>
              <Button
                type="button"
                variant={selectedProductType === "activity" ? "default" : "outline"}
                onClick={() => setSelectedProductType("activity")}
                className="flex-1"
              >
                Activities
              </Button>
              <Button
                type="button"
                variant={selectedProductType === "item" ? "default" : "outline"}
                onClick={() => setSelectedProductType("item")}
                className="flex-1"
              >
                Items
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
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
              
              {watchClientId && (
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset related fields when product changes
                            form.setValue("startTime", undefined);
                            form.setValue("endTime", undefined);
                            form.setValue("quantity", undefined);
                          }}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {watchProductId && renderProductSpecificFields()}
              
              {form.getValues("startTime") && form.getValues("endTime") && (
                <div className="text-sm text-muted-foreground">
                  Duration: {calculateDuration()}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add notes or description"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <CardFooter className="px-0 pb-0">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Time Entry"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
