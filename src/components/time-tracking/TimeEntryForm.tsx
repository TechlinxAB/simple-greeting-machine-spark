
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfDay, parse, addMinutes, differenceInMinutes } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { TimePicker } from "./TimePicker";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Define schema for form validation
const formSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  productId: z.string().min(1, "Product is required"),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  quantity: z.number().min(1, "Quantity is required").optional(),
  description: z.string().optional(),
});

// Define the form input type
type FormInput = z.infer<typeof formSchema>;

interface TimeEntryFormProps {
  onSuccess: () => void;
  selectedDate: Date;
}

export function TimeEntryForm({ onSuccess, selectedDate }: TimeEntryFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  
  // Initialize the form
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      productId: "",
      description: "",
      quantity: 1,
    },
  });

  // Fetch clients
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
  
  // Fetch products
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

  // Update selected product type when product changes
  const watchProductId = form.watch("productId");
  
  useEffect(() => {
    if (watchProductId) {
      const selectedProduct = products.find(product => product.id === watchProductId);
      if (selectedProduct) {
        setSelectedProductType(selectedProduct.type);
        
        // Reset fields based on product type
        if (selectedProduct.type === "activity") {
          form.setValue("quantity", undefined);
          
          // Initialize start and end time if they're not set
          if (!form.getValues("startTime")) {
            const currentTime = new Date();
            form.setValue("startTime", currentTime);
          }
          
          if (!form.getValues("endTime")) {
            const startTime = form.getValues("startTime");
            if (startTime) {
              form.setValue("endTime", new Date(startTime.getTime() + 60 * 60 * 1000)); // Add 1 hour
            }
          }
        } else {
          form.setValue("startTime", undefined);
          form.setValue("endTime", undefined);
          
          // Set default quantity if not set
          if (!form.getValues("quantity")) {
            form.setValue("quantity", 1);
          }
        }
      }
    } else {
      setSelectedProductType(null);
    }
  }, [watchProductId, products, form]);

  // Function to round minutes to nearest 15-minute interval
  const roundToNearestInterval = (date: Date): Date => {
    const minutes = date.getMinutes();
    let roundedMinutes = 0;
    
    if (minutes < 15) {
      roundedMinutes = 15;
    } else if (minutes < 30) {
      roundedMinutes = 30;
    } else if (minutes < 45) {
      roundedMinutes = 45;
    } else {
      roundedMinutes = 0;
      date = addMinutes(date, 60); // Add an hour
    }
    
    const result = new Date(date);
    result.setMinutes(roundedMinutes);
    result.setSeconds(0);
    result.setMilliseconds(0);
    
    return result;
  };

  // Handle form submission
  const onSubmit = async (values: FormInput) => {
    if (!user) {
      toast.error("You must be logged in to create time entries");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const entryData: any = {
        client_id: values.clientId,
        product_id: values.productId,
        user_id: user.id,
        description: values.description || null,
      };
      
      // Format data based on product type
      if (selectedProductType === "activity" && values.startTime && values.endTime) {
        // Apply 15-minute rounding to start and end times
        const roundedStartTime = roundToNearestInterval(values.startTime);
        const roundedEndTime = roundToNearestInterval(values.endTime);
        
        // Ensure end time is after start time
        if (roundedEndTime <= roundedStartTime) {
          toast.error("End time must be after start time");
          setIsSubmitting(false);
          return;
        }
        
        // Set the date part from selectedDate
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        
        // Combine date from selectedDate with time from start/end time
        const startStr = format(roundedStartTime, "HH:mm:ss");
        const endStr = format(roundedEndTime, "HH:mm:ss");
        
        const fullStartTime = parse(`${dateStr} ${startStr}`, "yyyy-MM-dd HH:mm:ss", new Date());
        const fullEndTime = parse(`${dateStr} ${endStr}`, "yyyy-MM-dd HH:mm:ss", new Date());
        
        entryData.start_time = fullStartTime.toISOString();
        entryData.end_time = fullEndTime.toISOString();
        
      } else if (selectedProductType === "item" && values.quantity) {
        entryData.quantity = values.quantity;
      } else {
        toast.error("Invalid form data for the selected product type");
        setIsSubmitting(false);
        return;
      }
      
      // Insert the time entry
      const { error } = await supabase
        .from("time_entries")
        .insert(entryData);
        
      if (error) throw error;
      
      toast.success("Time entry created successfully");
      form.reset({
        clientId: "",
        productId: "",
        description: "",
        quantity: 1,
      });
      
      setSelectedProductType(null);
      onSuccess();
      
    } catch (error: any) {
      toast.error(`Error creating time entry: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border rounded-md p-4 bg-card shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Create Time Entry</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.type === "activity" ? "Activity" : "Item"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {selectedProductType === "activity" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <TimePicker
                        date={field.value || new Date()}
                        setDate={field.onChange}
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
                        date={field.value || new Date()}
                        setDate={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {selectedProductType === "item" && (
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
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Create Time Entry'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
