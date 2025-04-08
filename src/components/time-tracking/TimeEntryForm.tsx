
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Package } from "lucide-react";
import type { ProductType } from "@/types";

const formSchema = z.object({
  clientId: z.string().min(1, { message: "Please select a client" }),
  productId: z.string().min(1, { message: "Please select a product" }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  quantity: z.coerce.number().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TimeEntryForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProductType>("activity");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      productId: "",
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endTime: "",
      quantity: undefined,
      description: "",
    },
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .order("name");
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching clients:", error);
        return [];
      }
    },
  });

  // Fetch products based on active tab
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["products", activeTab],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price")
          .eq("type", activeTab as string)
          .order("name");
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching products:", error);
        return [];
      }
    },
  });

  useEffect(() => {
    refetchProducts();
  }, [activeTab, refetchProducts]);

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error("You must be logged in to create time entries");
      return;
    }

    try {
      const baseEntry = {
        user_id: user.id,
        client_id: values.clientId,
        product_id: values.productId,
        description: values.description || null,
      };

      // Create the entry object with the right fields based on the active tab
      const entryData = activeTab === "activity" 
        ? { 
            ...baseEntry,
            start_time: values.startTime || null, 
            end_time: values.endTime || null 
          } 
        : { 
            ...baseEntry,
            quantity: values.quantity || null
          };

      const { error } = await supabase
        .from("time_entries")
        .insert(entryData);

      if (error) throw error;
      
      toast.success("Time entry created successfully");
      form.reset({
        clientId: values.clientId, // Keep the selected client
        productId: "", // Reset product
        startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endTime: "",
        quantity: undefined,
        description: "",
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create time entry");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Time Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "activity" | "item")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Activity</span>
            </TabsTrigger>
            <TabsTrigger value="item" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Item</span>
            </TabsTrigger>
          </TabsList>
          
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
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
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
                    <FormLabel>{activeTab === "activity" ? "Activity" : "Item"}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${activeTab}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.price} SEK
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TabsContent value="activity" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
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
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="item" className="mt-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add a description for this entry..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">Save Entry</Button>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
