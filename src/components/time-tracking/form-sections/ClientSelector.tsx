
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
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ClientSelectorProps {
  form: any;
  loading: boolean;
  isCompact?: boolean;
}

export function ClientSelector({ form, loading, isCompact }: ClientSelectorProps) {
  const { t } = useTranslation();
  
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

  return (
    <FormField
      control={form.control}
      name="clientId"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={isCompact ? "text-sm" : ""}>{t("clients.client")}</FormLabel>
          <Select 
            onValueChange={field.onChange} 
            defaultValue={field.value}
            disabled={loading}
          >
            <FormControl>
              <SelectTrigger className={isCompact ? "h-8 text-xs" : ""}>
                <SelectValue placeholder={t("timeTracking.selectAClient")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id} className={isCompact ? "text-xs" : ""}>
                  {client.name}
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
