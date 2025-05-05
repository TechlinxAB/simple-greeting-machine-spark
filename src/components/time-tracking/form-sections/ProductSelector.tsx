
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
}

export function ProductSelector({ form, loading, isCompact, onProductChange }: ProductSelectorProps) {
  const { t } = useTranslation();
  
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

  return (
    <FormField
      control={form.control}
      name="productId"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={isCompact ? "text-sm" : ""}>{t("products.productOrActivity")}</FormLabel>
          <Select 
            onValueChange={(value) => {
              field.onChange(value);
              const selectedProduct = products.find(p => p.id === value);
              if (selectedProduct) {
                onProductChange(selectedProduct.type, selectedProduct.price);
              }
            }} 
            defaultValue={field.value}
            disabled={loading}
          >
            <FormControl>
              <SelectTrigger className={isCompact ? "h-8 text-xs" : ""}>
                <SelectValue placeholder={t("products.selectAProduct")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id} className={isCompact ? "text-xs" : ""}>
                  {product.name} ({product.type}) - {product.price} SEK
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
