
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, User as UserIcon, Loader2 } from "lucide-react";
import { type User } from "@/types";

interface UsersTableProps {
  searchTerm?: string;
  isCompact?: boolean;
}

export function UsersTable({ searchTerm = '', isCompact }: UsersTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Get all profiles as a fallback when the edge function fails
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, role, avatar_url");
        
        if (error) throw error;
        
        return data.map(profile => ({
          id: profile.id,
          name: profile.name,
          role: profile.role || 'user',
          avatar_url: profile.avatar_url
        })) as User[];
      } catch (err) {
        console.error("Failed to fetch profiles:", err);
        return [] as User[];
      }
    },
    enabled: true,
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

  const filteredUsers = profiles.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  const roleIcons = {
    admin: <Shield className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-red-500`} />,
    manager: <Shield className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-blue-500`} />,
    user: <UserIcon className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
  };

  const roleColors = {
    admin: "text-red-600",
    manager: "text-blue-600",
    user: "text-gray-600"
  };

  const handleViewUserStats = (userId: string) => {
    navigate(`/user-stats/${userId}`);
  };

  return (
    <div className="space-y-4">      
      <div className="rounded-md border">
        {isLoadingProfiles ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className={`${isCompact ? 'h-5 w-5' : 'h-8 w-8'} animate-spin text-muted-foreground`} />
          </div>
        ) : (
          <Table isCompact={isCompact}>
            <TableHeader>
              <TableRow>
                <TableHead isCompact={isCompact}>{t('common.user')}</TableHead>
                <TableHead isCompact={isCompact}>{t('common.role')}</TableHead>
                <TableHead isCompact={isCompact}>{t('administration.hoursThisMonth')}</TableHead>
                <TableHead isCompact={isCompact}>{t('administration.revenueThisMonth')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <TableRow 
                    key={user.id} 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleViewUserStats(user.id)}
                  >
                    <TableCell isCompact={isCompact} className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className={isCompact ? "h-6 w-6" : "h-8 w-8"}>
                          <AvatarImage src={user.avatar_url || ""} alt={user.name || t('common.user')} />
                          <AvatarFallback className="bg-primary/10">
                            {(user.name?.charAt(0) || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className={isCompact ? "text-xs" : "text-sm"}>{user.name}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell isCompact={isCompact}>
                      <span 
                        className={`
                          ${roleColors[user.role as keyof typeof roleColors]} 
                          capitalize font-medium
                        `}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell isCompact={isCompact}>{getUserHours(user.id)} {t('common.hours').charAt(0).toLowerCase()}</TableCell>
                    <TableCell isCompact={isCompact}>{getUserRevenue(user.id)} SEK</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {searchTerm ? t('administration.noUsers').replace('No users found', 'No users match your search') : t('administration.noUsers')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
