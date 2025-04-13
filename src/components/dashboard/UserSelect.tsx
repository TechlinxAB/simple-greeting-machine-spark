
import { useState, useEffect } from "react";
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
  value: string | null;
  onChange: (value: string | null) => void;
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
    <div className="min-w-[200px]">
      <Select
        value={value || ""}
        onValueChange={(val) => onChange(val || null)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Users</SelectItem>
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
