
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClientSelect({ value, onChange }: ClientSelectProps) {
  const { data: clients = [], isLoading } = useQuery({
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

  return (
    <Select
      value={value || "all-clients"} 
      onValueChange={(val) => onChange(val === "all-clients" ? "" : val)}
    >
      <SelectTrigger className="bg-background w-[180px]">
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
