import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TimePicker } from "./TimePicker";

interface TimeEntryEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntryId: string;
  onSuccess?: () => void;
}

const formSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  quantity: z.number().optional(),
  description: z.string().optional(),
  customPrice: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TimeEntryEditForm({
  open,
  onOpenChange,
  timeEntryId,
  onSuccess,
}: TimeEntryEditFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: timeEntry, isLoading: isTimeEntryLoading, error: timeEntryError } = useQuery({
    queryKey: ["time-entry", timeEntryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, 
          description, 
          start_time, 
          end_time, 
          quantity,
          custom_price,
          products:product_id (id, name, type, price),
          clients:client_id (id, name)
        `)
        .eq("id", timeEntryId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startTime: "",
      endTime: "",
      quantity: undefined,
      description: "",
      customPrice: undefined,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (timeEntry) {
      form.reset({
        startTime: timeEntry.start_time,
        endTime: timeEntry.end_time,
        quantity: timeEntry.quantity,
        description: timeEntry.description,
        customPrice: timeEntry.custom_price,
      });
    }
  }, [timeEntry, form]);

  const { mutate: updateTimeEntry, isLoading: isUpdateLoading } = useMutation({
    mutationFn: async (data: FormValues) => {
      setIsSubmitting(true);
      const { startTime, endTime, quantity, description, customPrice } = data;

      const updates = {
        start_time: startTime,
        end_time: endTime,
        quantity: quantity !== null ? quantity : null,
        description,
        custom_price: customPrice !== null ? customPrice : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("time_entries")
        .update(updates)
        .eq("id", timeEntryId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success(t('timeTracking.timeEntryUpdated'));
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(t('timeTracking.timeEntryFailure'));
      console.error("Error updating time entry:", error);
    },
  });

  // Format price with currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("sv-SE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Handle form submission
  const handleSubmit = async (formData: FormValues) => {
    try {
      await updateTimeEntry(formData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('timeTracking.editTimeEntry')}</DialogTitle>
          <DialogDescription>
            {t('timeTracking.editTimeEntryDesc')}
          </DialogDescription>
        </DialogHeader>

        {isTimeEntryLoading ? (
          <div className="py-6">{t('common.loading')}</div>
        ) : timeEntryError ? (
          <div className="py-6 text-destructive">
            {t('error.loadingFailed')}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('clients.client')}</Label>
                  <div className="font-semibold">
                    {timeEntry?.clients?.name || t('clients.unknownClient')}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('common.product')}</Label>
                  <div className="font-semibold">
                    {timeEntry?.products?.name || t('products.deletedProduct')}
                  </div>
                </div>
              </div>

              {timeEntry?.products?.type === 'activity' ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel>{t('timeTracking.fromTime')}</FormLabel>
                        <TimePicker
                          value={field.value}
                          onChange={(newTime) => field.onChange(newTime)}
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
                          value={field.value}
                          onChange={(newTime) => field.onChange(newTime)}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.quantity')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? null : parseFloat(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Custom Price */}
              <FormField
                control={form.control}
                name="customPrice"
                render={({ field }) => {
                  const defaultPrice = timeEntry?.products?.price || 0;

                  return (
                    <FormItem>
                      <FormLabel>
                        {t('products.customPrice')} ({t('products.defaultPrice')}: {formatPrice(defaultPrice)})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder={defaultPrice.toString()}
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('timeTracking.descriptionPlaceholder')}
                        className="min-h-[80px] resize-none"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('common.saving') : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
