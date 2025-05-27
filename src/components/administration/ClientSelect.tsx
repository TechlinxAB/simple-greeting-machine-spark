
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useIsLaptop } from "@/hooks/use-mobile";

interface ClientSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClientSelect({ value, onChange }: ClientSelectProps) {
  const isLaptop = useIsLaptop();
  
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-full ${isLaptop ? 'h-8 text-xs' : 'h-10 text-sm'}`}>
        <SelectValue placeholder="All Clients" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all-clients">All Clients</SelectItem>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
