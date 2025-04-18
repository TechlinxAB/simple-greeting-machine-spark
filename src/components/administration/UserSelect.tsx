
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function UserSelect({ value, onChange }: UserSelectProps) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name")
          .order("name");
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching users:", error);
        return [];
      }
    },
  });

  return (
    <Select
      value={value || "all"} 
      onValueChange={(val) => onChange(val === "all-users" ? "all" : val)}
    >
      <SelectTrigger className="bg-background w-full">
        <SelectValue placeholder="All Users">
          {value === "all" ? "All Users" : users.find(u => u.id === value)?.name || "All Users"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Users</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name || 'Unnamed User'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
