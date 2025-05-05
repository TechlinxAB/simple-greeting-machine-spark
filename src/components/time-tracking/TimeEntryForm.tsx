import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/time-tracking/TimePicker";
import { ClientForm } from "@/components/clients/ClientForm";
import { format } from "date-fns";
import { Clock, Package, Plus } from "lucide-react";

interface TimeEntryFormProps {
  onSuccess?: () => void;
  selectedDate: Date;
  isCompact?: boolean;
}

interface FormValues {
  clientId: string;
  productId: string;
  productType: string;
  startTime?: string;
  endTime?: string;
  quantity?: number;
  description?: string;
  customPrice?: number;
}

export function TimeEntryForm({ 
  onSuccess,
  selectedDate,
  isCompact = false,
}: TimeEntryFormProps) {
  const { t } = useTranslation();
  const [showClientForm, setShowClientForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  
  // Get the client ID from the form for filtering products
  const clientId = useForm().watch('clientId');
  const productType = useForm().watch('productType');
  const productId = useForm().watch('productId');

  // Schema for validating the form
  const formSchema = z.object({
    clientId: z.string().min(1, { message: "Client is required" }),
    productType: z.string().min(1, { message: "Product type is required" }),
    productId: z.string().min(1, { message: "Product is required" }),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    quantity: z.number().optional(),
    description: z.string().optional(),
    customPrice: z.number().optional(),
  }).refine((data) => {
    // For activities, both start and end time are required
    if (data.productType === 'activity') {
      return !!data.startTime && !!data.endTime;
    }
    return true;
  }, {
    message: "Both start and end time are required for activities",
    path: ["startTime"],
  }).refine((data) => {
    // For items, quantity is required
    if (data.productType === 'item') {
      return !!data.quantity;
    }
    return true;
  }, {
    message: "Quantity is required for items",
    path: ["quantity"],
  });

  // Helper function to format time
  const formatTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      productId: "",
      productType: "",
      startTime: formatTimeString(new Date()),
      endTime: formatTimeString(new Date()),
      quantity: undefined,
      description: "",
      customPrice: undefined,
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
    queryKey: ["products", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, type, price")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Filter products based on selected type
  const filteredProducts = products.filter(
    (product) => product.type === productType
  );

  // Format price with currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Handle form submission
  const handleSubmit = async (formData: FormValues) => {
    try {
      setIsSubmitting(true);
      
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Prepare the data for insertion
      const timeEntryData: any = {
        client_id: formData.clientId,
        product_id: formData.productId,
        description: formData.description || null,
        custom_price: formData.customPrice || null,
      };
      
      // Add type-specific fields
      if (formData.productType === 'activity') {
        // For activities, combine date with time
        timeEntryData.start_time = `${dateStr}T${formData.startTime}:00`;
        timeEntryData.end_time = `${dateStr}T${formData.endTime}:00`;
      } else {
        // For items, use the current date and time
        timeEntryData.quantity = formData.quantity;
        timeEntryData.created_at = new Date().toISOString();
      }
      
      // Insert the time entry
      const { data, error } = await supabase
        .from("time_entries")
        .insert(timeEntryData)
        .select();
      
      if (error) throw error;
      
      // Reset the form
      form.reset({
        clientId: formData.clientId, // Keep the client selected
        productId: "",
        productType: "",
        startTime: formatTimeString(new Date()),
        endTime: formatTimeString(new Date()),
        quantity: undefined,
        description: "",
        customPrice: undefined,
      });
      
      // Call the success callback
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error("Error creating time entry:", error);
      toast.error(t('timeTracking.timeEntryFailure'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle client creation success
  const handleClientCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  return (
    <Card className={cn(isCompact ? "shadow-sm" : "")}>
      <CardHeader className={cn("pb-4", isCompact && "py-4")}>
        <CardTitle className={cn("text-lg", isCompact && "text-base")}>
          {t('timeTracking.addTimeEntry')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Client selection */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>{t('timeTracking.selectClient')}</FormLabel>
                  <div className="flex space-x-2">
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset product when client changes
                        form.setValue('productId', '');
                        form.setValue('productType', '');
                        form.setValue('customPrice', undefined);
                      }}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        className={cn(
                          isCompact ? "h-8 text-sm" : "",
                          "flex-1"
                        )}
                      >
                        <SelectValue placeholder={t('clients.selectClient')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {Array.isArray(clients) &&
                            clients.map((client) => (
                              <SelectItem
                                key={client.id}
                                value={client.id}
                                className={isCompact ? "text-sm" : ""}
                              >
                                {client.name}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      size={isCompact ? "sm" : "default"}
                      onClick={() => setShowClientForm(true)}
                    >
                      <Plus className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product type selection */}
            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>{t('common.type')}:</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('productId', '');
                      form.setValue('customPrice', undefined);
                      if (value === 'activity') {
                        form.setValue('quantity', undefined);
                      }
                    }}
                    value={field.value}
                    disabled={!clientId || isSubmitting}
                  >
                    <SelectTrigger className={isCompact ? "h-8 text-sm" : ""}>
                      <SelectValue placeholder={t('timeTracking.whatProduct')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="activity"
                        className={isCompact ? "text-sm" : ""}
                      >
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-blue-500" />
                          <span className="capitalize">{t('products.activity')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="item"
                        className={isCompact ? "text-sm" : ""}
                      >
                        <div className="flex items-center">
                          <Package className="mr-2 h-4 w-4 text-primary" />
                          <span className="capitalize">{t('products.item')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product selection */}
            {productType && (
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>
                      {productType === 'activity'
                        ? t('timeTracking.selectActivity')
                        : t('timeTracking.selectItem')}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        
                        // Find the selected product to set default price
                        const selectedProduct = filteredProducts.find(
                          (p) => p.id === value
                        );
                        if (selectedProduct) {
                          form.setValue('customPrice', selectedProduct.price);
                        } else {
                          form.setValue('customPrice', undefined);
                        }
                      }}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className={isCompact ? "h-8 text-sm" : ""}>
                        <SelectValue
                          placeholder={
                            productType === 'activity'
                              ? t('timeTracking.selectActivity')
                              : t('timeTracking.selectItem')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.length === 0 ? (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            {t('products.noProductsFound')}
                          </div>
                        ) : (
                          filteredProducts.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id}
                              className={isCompact ? "text-sm" : ""}
                            >
                              {product.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Time inputs for activities */}
            {productType === 'activity' && productId && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>{t('timeTracking.fromTime')}</FormLabel>
                      <TimePicker
                        value={field.value || ''}
                        onChange={(newTime) => field.onChange(newTime)}
                        isCompact={isCompact}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>{t('timeTracking.toTime')}</FormLabel>
                      <TimePicker
                        value={field.value || ''}
                        onChange={(newTime) => field.onChange(newTime)}
                        isCompact={isCompact}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Quantity input for items */}
            {productType === 'item' && productId && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>{t('timeTracking.quantity')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder={t('timeTracking.quantityPlaceholder')}
                        className={isCompact ? "h-8 text-sm" : ""}
                        {...field}
                        value={field.value === undefined ? '' : field.value}
                        onChange={(e) => {
                          const value = e.target.value === '' 
                            ? undefined 
                            : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Custom Price */}
            {productId && (
              <FormField
                control={form.control}
                name="customPrice"
                render={({ field }) => {
                  const selectedProduct = filteredProducts.find(p => p.id === productId);
                  const defaultPrice = selectedProduct?.price || 0;
                  
                  return (
                    <FormItem className="space-y-1">
                      <FormLabel>
                        {t('products.customPrice')} ({t('products.defaultPrice')}: {formatPrice(defaultPrice)})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder={defaultPrice.toString()}
                          className={isCompact ? "h-8 text-sm" : ""}
                          {...field}
                          value={field.value === undefined ? '' : field.value}
                          onChange={(e) => {
                            const value = e.target.value === '' 
                              ? undefined 
                              : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            {/* Description */}
            {productId && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>{t('timeTracking.descriptionOptional')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('timeTracking.descriptionPlaceholder')}
                        className={cn(
                          "min-h-[80px] resize-none",
                          isCompact && "text-sm"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full"
              size={isCompact ? "sm" : "default"}
              disabled={!clientId || !productId || isSubmitting}
            >
              {isSubmitting ? t('common.saving') : t('timeTracking.logTime')}
            </Button>
          </form>
        </Form>
        
        <ClientForm
          open={showClientForm}
          onOpenChange={setShowClientForm}
          onSuccess={handleClientCreated}
        />
      </CardContent>
    </Card>
  );
}
