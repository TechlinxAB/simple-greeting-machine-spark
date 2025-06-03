
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsLaptop } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ClientSelector } from "./form-sections/ClientSelector";
import { ProductSelector } from "./form-sections/ProductSelector";
import { ActivityFields } from "./form-sections/ActivityFields";
import { ProductFields } from "./form-sections/ProductFields";
import { useTimeEntrySubmit } from "@/hooks/useTimeEntrySubmit";

interface TimeEntryEditFormProps {
  timeEntry: any;
  onSuccess: () => void;
  onCancel: () => void;
  isCompact?: boolean;
}

export function TimeEntryEditForm({ timeEntry, onSuccess, onCancel, isCompact }: TimeEntryEditFormProps) {
  const { t } = useTranslation();
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const [selectedProductPrice, setSelectedProductPrice] = useState<number | null>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const autoIsLaptop = useIsLaptop();
  
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;

  // Create form schema with translated error messages
  const formSchema = z.object({
    clientId: z.string().uuid(t("timeTracking.clientRequired")),
    productId: z.string().uuid(t("timeTracking.productRequired")),
    description: z.string().optional(),
    quantity: z.coerce.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    customPrice: z.number().optional().nullable(),
    productType: z.string().optional()
  });

  type FormValues = z.infer<typeof formSchema>;

  // Use the original times for display if available, otherwise fall back to rounded times
  const displayStartTime = timeEntry?.original_start_time || timeEntry?.start_time;
  const displayEndTime = timeEntry?.original_end_time || timeEntry?.end_time;
  
  console.log("Form initialization with start:", displayStartTime, "end:", displayEndTime);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: timeEntry?.client_id || "",
      productId: timeEntry?.product_id || "",
      description: timeEntry?.description || "",
      quantity: timeEntry?.quantity || undefined,
      startTime: displayStartTime 
        ? format(new Date(displayStartTime), "HH:mm") 
        : undefined,
      endTime: displayEndTime 
        ? format(new Date(displayEndTime), "HH:mm") 
        : undefined,
      customPrice: timeEntry?.custom_price || null,
      productType: timeEntry?.products?.type || null
    },
  });

  useEffect(() => {
    // Get initial product type from the time entry
    if (timeEntry?.products?.type) {
      setSelectedProductType(timeEntry.products.type);
      setSelectedProductPrice(timeEntry.products.price);
      form.setValue("productType", timeEntry.products.type);
    }
  }, [timeEntry, form]);

  const { loading, handleSubmit } = useTimeEntrySubmit({
    timeEntry,
    form,
    onSuccess,
    startTimeRef,
    endTimeRef
  });

  const handleProductChange = (type: string | null, price: number | null) => {
    setSelectedProductType(type);
    setSelectedProductPrice(price);
    form.setValue("productType", type || "");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-4", compact ? "text-sm" : "")}>
        <ClientSelector 
          form={form} 
          loading={loading} 
          isCompact={compact} 
        />
        
        <ProductSelector 
          form={form} 
          loading={loading} 
          isCompact={compact} 
          onProductChange={handleProductChange}
          filterByType={selectedProductType} // Always filter by the selected product type when editing
          isEditing={true}
        />
        
        {selectedProductType === "activity" && (
          <ActivityFields 
            form={form} 
            loading={loading} 
            isCompact={compact} 
            selectedProductPrice={selectedProductPrice}
            isEditing={true}
            showCustomPrice={false} // Don't show custom price for activities when editing
          />
        )}
        
        {selectedProductType === "product" && (
          <ProductFields 
            form={form} 
            loading={loading} 
            isCompact={compact} 
            selectedProductPrice={selectedProductPrice}
          />
        )}
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={compact ? "text-sm" : ""}>{t("timeTracking.descriptionOptional")}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={t("timeTracking.enterDescription")}
                  className={cn("resize-none", compact ? "text-xs" : "")}
                  {...field} 
                  disabled={loading}
                />
              </FormControl>
              <FormMessage className={compact ? "text-xs" : ""} />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
            className={compact ? "h-8 text-xs px-3" : ""}
          >
            {t("common.cancel")}
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className={compact ? "h-8 text-xs px-3" : ""}
          >
            {loading && <Loader2 className={cn("mr-2 animate-spin", compact ? "h-3 w-3" : "h-4 w-4")} />}
            {t("timeTracking.updateTimeEntry")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
