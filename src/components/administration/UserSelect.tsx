
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

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function UserSelect({ value, onChange }: UserSelectProps) {
  const isLaptop = useIsLaptop();
  
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-full ${isLaptop ? 'h-9 text-xs' : 'h-10 text-sm'}`}>
        <SelectValue placeholder="All Users" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Users</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
