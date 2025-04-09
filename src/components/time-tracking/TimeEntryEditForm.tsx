
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TimePicker } from "./TimePicker";
import { differenceInMinutes } from "date-fns";

// Simplified schema for editing - all fields are optional to allow partial updates
const timeEntrySchema = z.object({
  clientId: z.string().optional(),
  productId: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  quantity: z.number().optional(),
  description: z.string().optional(),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

interface TimeEntryEditFormProps {
  timeEntry: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TimeEntryEditForm({ timeEntry, onSuccess, onCancel }: TimeEntryEditFormProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>(
    timeEntry.products?.type || "activity"
  );
  
  // Ref for focus management
  const endTimeRef = useRef<HTMLDivElement>(null);

  // Setup form with the existing time entry data
  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      clientId: timeEntry.client_id || "",
      productId: timeEntry.product_id || "",
      description: timeEntry.description || "",
      startTime: timeEntry.start_time ? new Date(timeEntry.start_time) : undefined,
      endTime: timeEntry.end_time ? new Date(timeEntry.end_time) : undefined,
      quantity: timeEntry.quantity,
    },
    mode: "onSubmit"
  });

  const watchProductId = form.watch("productId");

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
        
        // Set selected product type based on the timeEntry
        if (timeEntry.products?.type) {
          setSelectedProductType(timeEntry.products.type);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
        toast.error("Failed to load clients and products");
      }
    };

    fetchData();
  }, [timeEntry]);

  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
  };

  const handleStartTimeComplete = () => {
    // Focus the end time field after completing the start time
    if (endTimeRef.current) {
      const input = endTimeRef.current.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  };

  const onSubmit = async (values: TimeEntryFormValues) => {
    console.log("Starting update with values:", values);
    setIsLoading(true);
    
    try {
      const currentProduct = getProductById(values.productId || timeEntry.product_id);
      const productType = currentProduct?.type || selectedProductType;
      
      console.log("Current product:", currentProduct);
      console.log("Product type:", productType);
      
      // Prepare update data
      const timeEntryData: any = {
        // Only include fields that are actually set in values
        ...(values.clientId && { client_id: values.clientId }),
        ...(values.productId && { product_id: values.productId }),
        ...(values.description !== undefined && { description: values.description }),
      };

      // Handle time fields based on product type
      if (productType === "activity") {
        // For activities, handle start_time and end_time
        if (values.startTime) {
          timeEntryData.start_time = values.startTime.toISOString();
        }
        
        if (values.endTime) {
          timeEntryData.end_time = values.endTime.toISOString();
        }
        
        // If we're switching from item to activity, clear quantity
        if (timeEntry.products?.type === "item" && !timeEntryData.quantity) {
          timeEntryData.quantity = null;
        }
      } else if (productType === "item") {
        // For items, handle quantity
        if (values.quantity !== undefined) {
          timeEntryData.quantity = values.quantity;
        }
        
        // If we're switching from activity to item, clear times
        if (timeEntry.products?.type === "activity") {
          timeEntryData.start_time = null;
          timeEntryData.end_time = null;
        }
      }

      console.log("Updating time entry with data:", timeEntryData);
      console.log("Time entry ID:", timeEntry.id);

      // Update the time entry in the database
      const { error } = await supabase
        .from("time_entries")
        .update(timeEntryData)
        .eq("id", timeEntry.id);

      if (error) {
        console.error("Error from Supabase:", error);
        throw error;
      }

      console.log("Update successful");
      toast.success("Time entry updated successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Error updating time entry:", error);
      toast.error(error.message || "Failed to update time entry");
    } finally {
      setIsLoading(false);
    }
  };

  const renderProductSpecificFields = () => {
    const product = getProductById(watchProductId || timeEntry.product_id);
    const productType = product?.type || selectedProductType;
    
    if (productType === "activity") {
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
                <FormLabel>Time to:</FormLabel>
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
    
    if (productType === "item") {
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Client:</FormLabel>
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
              <FormLabel>Product:</FormLabel>
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          
                          // Update product type when product changes
                          const product = getProductById(value);
                          if (product) {
                            setSelectedProductType(product.type);
                          }
                        }}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
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
            </div>
          </div>
          
          {renderProductSpecificFields()}
          
          {form.getValues("startTime") && form.getValues("endTime") && (
            <div className="text-sm text-muted-foreground">
              Duration: {calculateDuration()}
            </div>
          )}
          
          <div>
            <FormLabel>Description:</FormLabel>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description here..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
