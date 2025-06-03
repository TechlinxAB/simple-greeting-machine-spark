
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface ProductFieldsProps {
  form: any;
  loading: boolean;
  isCompact?: boolean;
  selectedProductPrice: number | null;
}

export function ProductFields({ form, loading, isCompact, selectedProductPrice }: ProductFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <FormField
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("common.quantity")}</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                min="1"
                step="1"
                {...field} 
                disabled={loading}
                className={isCompact ? "h-8 text-xs" : ""}
              />
            </FormControl>
            <FormMessage className={isCompact ? "text-xs" : ""} />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="customPrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("products.customPrice")} ({t("products.defaultPrice")}: {selectedProductPrice || 0} SEK)
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={selectedProductPrice?.toString() || "0.00"}
                {...field}
                value={field.value === null ? '' : field.value}
                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                disabled={loading}
                className={isCompact ? "h-8 text-xs" : ""}
              />
            </FormControl>
            <FormMessage className={isCompact ? "text-xs" : ""} />
          </FormItem>
        )}
      />
    </>
  );
}
