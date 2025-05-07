
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
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
import { useTranslation } from "react-i18next";

interface ProductSelectorProps {
  form: any;
  loading: boolean;
  isCompact?: boolean;
  onProductChange: (type: string | null, price: number | null) => void;
  filterByType?: string; // Add option to filter by product type
  isEditing?: boolean; // Is this for editing an existing entry?
}

export function ProductSelector({ 
  form, 
  loading, 
  isCompact, 
  onProductChange, 
  filterByType,
  isEditing = false
}: ProductSelectorProps) {
  const { t } = useTranslation();
  
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const query = supabase
        .from("products")
        .select("id, name, type, price")
        .order("name");
        
      // If filterByType is specified, only show products of that type
      if (filterByType) {
        query.eq("type", filterByType);
      }
        
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
  
  // Determine the label based on the product type filter
  const getFieldLabel = () => {
    if (filterByType === "activity") {
      return t("timeTracking.selectActivity");
    } else if (filterByType === "item") {
      return t("timeTracking.selectItem");
    } else {
      return t("products.productOrActivity");
    }
  };

  return (
    <FormField
      control={form.control}
      name="productId"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={isCompact ? "text-sm" : ""}>{getFieldLabel()}</FormLabel>
          <Select 
            onValueChange={(value) => {
              field.onChange(value);
              const selectedProduct = products.find(p => p.id === value);
              if (selectedProduct) {
                onProductChange(selectedProduct.type, selectedProduct.price);
              }
            }} 
            defaultValue={field.value}
            disabled={loading} // Never disable the selector when editing, we filter by type instead
          >
            <FormControl>
              <SelectTrigger className={isCompact ? "h-8 text-xs" : ""}>
                <SelectValue placeholder={
                  filterByType === "activity" 
                    ? t("timeTracking.selectActivity") 
                    : filterByType === "item" 
                      ? t("timeTracking.selectItem") 
                      : t("products.selectAProduct")
                } />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id} className={isCompact ? "text-xs" : ""}>
                  {product.name} - {product.price} SEK
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage className={isCompact ? "text-xs" : ""} />
        </FormItem>
      )}
    />
  );
}
