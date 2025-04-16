
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Shield, User as UserIcon, UserRound, Loader2 } from "lucide-react";
import { type User } from "@/types";

interface UsersTableProps {
  searchTerm?: string;
  isCompact?: boolean;
  onUserSelect: (userId: string) => void;
}

export function UsersTable({ searchTerm = '', isCompact, onUserSelect }: UsersTableProps) {
  const { session } = useAuth();
  
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        if (!session?.access_token) {
          console.error("No active session");
          return [] as User[];
        }
        
        // Get users from Edge Function
        const { data, error } = await supabase.functions.invoke(
          'get-all-users',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        );
        
        if (error) throw error;
        
        if (!data || !Array.isArray(data)) {
          console.error("Unexpected data format from get-all-users:", data);
          return [] as User[];
        }
        
        return data.map((user: any) => ({
          id: user.id,
          email: user.email,
          name: user.profile_name || user.email.split('@')[0],
          role: user.profile_role || 'user',
          avatar_url: user.profile_avatar_url
        })) as User[];
      } catch (err) {
        console.error("Failed to fetch users:", err);
        return [] as User[];
      }
    },
    enabled: !!session?.access_token,
    refetchOnWindowFocus: false
  });

  // Get time entries for all users to show stats
  const { data: timeEntries = [] } = useQuery({
    queryKey: ["all-time-entries-current-month"],
    queryFn: async () => {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, user_id, start_time, end_time, quantity,
          products:product_id (id, name, type, price)
        `)
        .gte("created_at", firstDayOfMonth.toISOString())
        .lte("created_at", lastDayOfMonth.toISOString());
        
      if (error) throw error;
      return data || [];
    }
  });

  const getUserHours = (userId: string) => {
    return timeEntries
      .filter(entry => entry.user_id === userId && entry.products?.type === 'activity' && entry.start_time && entry.end_time)
      .reduce((total, entry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0).toFixed(1);
  };

  const getUserRevenue = (userId: string) => {
    return timeEntries
      .filter(entry => entry.user_id === userId)
      .reduce((total, entry) => {
        if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + (hours * (entry.products?.price || 0));
        } else if (entry.products?.type === 'item' && entry.quantity) {
          return total + (entry.quantity * (entry.products?.price || 0));
        }
        return total;
      }, 0).toFixed(0);
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  const roleIcons = {
    admin: <Shield className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-red-500`} />,
    manager: <Shield className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-blue-500`} />,
    user: <UserIcon className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
  };

  const roleBadgeVariants = {
    admin: "destructive",
    manager: "blue",
    user: "secondary",
  };

  return (
    <div className="rounded-md border">
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className={`${isCompact ? 'h-5 w-5' : 'h-8 w-8'} animate-spin text-muted-foreground`} />
        </div>
      ) : (
        <Table isCompact={isCompact}>
          <TableHeader>
            <TableRow>
              <TableHead isCompact={isCompact}>User</TableHead>
              <TableHead isCompact={isCompact}>Role</TableHead>
              <TableHead isCompact={isCompact}>Hours This Month</TableHead>
              <TableHead isCompact={isCompact}>Revenue This Month</TableHead>
              <TableHead isCompact={isCompact} className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <TableRow key={user.id} className="cursor-pointer hover:bg-muted/80" onClick={() => onUserSelect(user.id)}>
                  <TableCell isCompact={isCompact} className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className={isCompact ? "h-6 w-6" : "h-8 w-8"}>
                        <AvatarImage src={user.avatar_url || ""} alt={user.name || "User"} />
                        <AvatarFallback className="bg-primary/10">
                          {(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className={isCompact ? "text-xs" : "text-sm"}>{user.name || user.email?.split('@')[0]}</span>
                        <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell isCompact={isCompact}>
                    <Badge variant={roleBadgeVariants[user.role as keyof typeof roleBadgeVariants] as any || "secondary"} className="flex items-center gap-1 w-fit">
                      {roleIcons[user.role as keyof typeof roleIcons] || <UserIcon className="h-3 w-3" />}
                      <span className="capitalize">{user.role}</span>
                    </Badge>
                  </TableCell>
                  <TableCell isCompact={isCompact}>{getUserHours(user.id)} h</TableCell>
                  <TableCell isCompact={isCompact}>{getUserRevenue(user.id)} SEK</TableCell>
                  <TableCell isCompact={isCompact}>
                    <Button variant="ghost" size={isCompact ? "sm" : "icon"} className="h-8 w-8 p-0" onClick={(e) => {
                      e.stopPropagation();
                      onUserSelect(user.id);
                    }}>
                      <ChevronRight className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      <span className="sr-only">View details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {searchTerm ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
