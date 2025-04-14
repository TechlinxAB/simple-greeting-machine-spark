
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";

interface UserSelectProps {
  selectedUserId: string | null;
  onUserChange: (value: string | null) => void;
  includeAllOption?: boolean;
  className?: string;
}

export function UserSelect({ selectedUserId, onUserChange, includeAllOption = false, className }: UserSelectProps) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        // Directly query the profiles table which contains user information
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
    <div className={className || ""}>
      <Select
        value={selectedUserId || "all-users"} 
        onValueChange={(val) => onUserChange(val === "all-users" ? null : val)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select user">
            <span className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              {selectedUserId 
                ? users.find(u => u.id === selectedUserId)?.name || "Unknown User" 
                : "All Users"}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && <SelectItem value="all-users">All Users</SelectItem>}
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name || 'Unnamed User'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
