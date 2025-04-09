
import { useState, useEffect } from "react";
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
  const [selectedProductType, setSelectedProductType] = useState<string>("activity");
  const [currentDate] = useState<Date>(new Date());

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

  // Find product details by ID
  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
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
        // Set the times
        timeEntryData.start_time = values.startTime.toISOString();
        timeEntryData.end_time = values.endTime.toISOString();
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time from:</FormLabel>
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
                <FormLabel>Time to:</FormLabel>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between">
          <span>New time entry</span>
          {isToday(selectedDate) && (
            <span className="text-sm bg-green-500 text-white px-3 py-1 rounded-md">Today</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Select client:</FormLabel>
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
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
                </div>
                
                <div>
                  <FormLabel>Activity / Item:</FormLabel>
                  <Select
                    value={selectedProductType}
                    onValueChange={setSelectedProductType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="item">Item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {watchClientId && (
                <div>
                  <FormLabel>What {selectedProductType}:</FormLabel>
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
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
                              <SelectValue placeholder={`Select an ${selectedProductType}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredProducts.map((product) => (
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
                  Duration: {calculateDuration()}
                </div>
              )}
              
              <div>
                <FormLabel>What did you do?</FormLabel>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Enter description here..."
                          className="min-h-[100px]"
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
                    Saving...
                  </>
                ) : (
                  "Save time entry"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
