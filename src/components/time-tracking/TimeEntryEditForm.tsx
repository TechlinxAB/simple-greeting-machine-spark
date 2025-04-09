
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
import { format, parse } from "date-fns";
import { toast } from "sonner";

// Form schema with validation
const formSchema = z.object({
  clientId: z.string().uuid("Please select a client"),
  productId: z.string().uuid("Please select a product or activity"),
  description: z.string().optional(),
  quantity: z.coerce.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TimeEntryEditFormProps {
  timeEntry: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TimeEntryEditForm({ timeEntry, onSuccess, onCancel }: TimeEntryEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  
  // Create state to store Date objects for TimePicker
  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);

  // Form setup with react-hook-form and zod validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: timeEntry?.client_id || "",
      productId: timeEntry?.product_id || "",
      description: timeEntry?.description || "",
      quantity: timeEntry?.quantity || undefined,
      startTime: timeEntry?.start_time 
        ? format(new Date(timeEntry.start_time), "HH:mm") 
        : undefined,
      endTime: timeEntry?.end_time 
        ? format(new Date(timeEntry.end_time), "HH:mm") 
        : undefined,
    },
  });

  // Convert string time to Date objects when form values change
  useEffect(() => {
    const startTimeValue = form.watch("startTime");
    const endTimeValue = form.watch("endTime");
    
    if (startTimeValue) {
      try {
        // Create a date object for today with the specified time
        const today = new Date();
        const [hours, minutes] = startTimeValue.split(":");
        const startDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          Number(hours),
          Number(minutes)
        );
        setStartTimeDate(startDate);
      } catch (error) {
        console.error("Error parsing start time:", error);
        setStartTimeDate(null);
      }
    } else {
      setStartTimeDate(null);
    }
    
    if (endTimeValue) {
      try {
        // Create a date object for today with the specified time
        const today = new Date();
        const [hours, minutes] = endTimeValue.split(":");
        const endDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          Number(hours),
          Number(minutes)
        );
        setEndTimeDate(endDate);
      } catch (error) {
        console.error("Error parsing end time:", error);
        setEndTimeDate(null);
      }
    } else {
      setEndTimeDate(null);
    }
  }, [form.watch("startTime"), form.watch("endTime")]);

  // Fetch clients for dropdown
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

  // Fetch products for dropdown
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

  // Set the product type when the form values change
  useEffect(() => {
    const productId = form.watch("productId");
    if (productId) {
      const selectedProduct = products.find(p => p.id === productId);
      if (selectedProduct) {
        setSelectedProductType(selectedProduct.type);
      }
    } else if (timeEntry?.products?.type) {
      setSelectedProductType(timeEntry.products.type);
    }
  }, [form.watch("productId"), products, timeEntry]);

  // Handle time change from TimePicker component
  const handleTimeChange = (field: string, value: Date | null) => {
    if (value) {
      // Convert Date to string in HH:mm format for form values
      const timeString = format(value, "HH:mm");
      form.setValue(field as "startTime" | "endTime", timeString);
    } else {
      form.setValue(field as "startTime" | "endTime", undefined);
    }
  };

  // Function to handle form submission
  const onSubmit = async (values: FormValues) => {
    console.log("Form values:", values);
    
    try {
      setLoading(true);
      
      // Extract time strings
      let startTimeString = values.startTime;
      let endTimeString = values.endTime;
      
      // For time picker components that use refs
      if (startTimeRef.current?.value) {
        startTimeString = startTimeRef.current.value;
      }
      
      if (endTimeRef.current?.value) {
        endTimeString = endTimeRef.current.value;
      }
      
      console.log("Start time:", startTimeString);
      console.log("End time:", endTimeString);
      
      // Prepare date objects for time entries if available
      const timeEntryDate = timeEntry.created_at 
        ? new Date(timeEntry.created_at) 
        : new Date();
        
      const datePart = format(timeEntryDate, "yyyy-MM-dd");
      
      // Construct full ISO datetime strings if time values are provided
      let startTime = null;
      let endTime = null;
      
      if (startTimeString && selectedProductType === "activity") {
        startTime = `${datePart}T${startTimeString}:00`;
      }
      
      if (endTimeString && selectedProductType === "activity") {
        endTime = `${datePart}T${endTimeString}:00`;
      }
      
      // Build the update data object
      const timeEntryData: any = {
        client_id: values.clientId,
        product_id: values.productId,
        description: values.description,
      };
      
      // Add time-specific fields based on product type
      if (selectedProductType === "activity") {
        timeEntryData.start_time = startTime;
        timeEntryData.end_time = endTime;
        timeEntryData.quantity = null; // Clear quantity for activity
      } else if (selectedProductType === "item") {
        timeEntryData.quantity = values.quantity;
        timeEntryData.start_time = null; // Clear times for item
        timeEntryData.end_time = null;
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
      
      // Call onSuccess to close the dialog and refresh the list
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={loading}
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
              <FormLabel>Product or Activity</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  const selectedProduct = products.find(p => p.id === value);
                  if (selectedProduct) {
                    setSelectedProductType(selectedProduct.type);
                  }
                }} 
                defaultValue={field.value}
                disabled={loading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Replacing empty string value with a placeholder message in SelectValue instead */}
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.type}) - {product.price} SEK
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedProductType === "activity" && (
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
                    step="1"
                    {...field} 
                    disabled={loading}
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
                <Textarea 
                  placeholder="Enter a description..."
                  className="resize-none"
                  {...field} 
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Time Entry
          </Button>
        </div>
      </form>
    </Form>
  );
}
