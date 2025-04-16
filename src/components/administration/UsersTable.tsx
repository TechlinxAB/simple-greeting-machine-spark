
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Shield, User as UserIcon, AlertCircle, Loader2, BarChart } from "lucide-react";
import { type User } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart as CustomBarChart, PieChart } from "@/components/dashboard/CustomCharts";

interface UsersTableProps {
  searchTerm?: string;
  isCompact?: boolean;
}

export function UsersTable({ searchTerm = '', isCompact }: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserStats, setShowUserStats] = useState(false);

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

  // Get client data for user stats
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name");
        
      if (error) throw error;
      return data || [];
    }
  });

  // Get user-specific time entries when a user is selected
  const { data: userTimeEntries = [], isLoading: isLoadingUserEntries } = useQuery({
    queryKey: ["user-time-entries", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, client_id, product_id, start_time, end_time, quantity,
          products:product_id (id, name, type, price),
          clients:client_id (id, name)
        `)
        .eq("user_id", selectedUser.id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUser,
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

  const handleViewUserStats = (user: User) => {
    setSelectedUser(user);
    setShowUserStats(true);
  };

  // Calculate stats for the selected user
  const getUserClientStats = () => {
    if (!selectedUser || userTimeEntries.length === 0) return [];
    
    const clientStats = userTimeEntries.reduce((acc, entry) => {
      const clientId = entry.client_id;
      const clientName = entry.clients?.name || 'Unknown Client';
      
      if (!acc[clientId]) {
        acc[clientId] = { name: clientName, hours: 0, revenue: 0 };
      }
      
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        acc[clientId].hours += hours;
        acc[clientId].revenue += hours * (entry.products?.price || 0);
      } else if (entry.products?.type === 'item' && entry.quantity) {
        acc[clientId].revenue += entry.quantity * (entry.products?.price || 0);
      }
      
      return acc;
    }, {});
    
    return Object.values(clientStats)
      .sort((a, b) => b.hours - a.hours)
      .map(stat => ({
        name: stat.name,
        hours: parseFloat(stat.hours.toFixed(1)),
        revenue: Math.round(stat.revenue)
      }));
  };
  
  const getUserProductStats = () => {
    if (!selectedUser || userTimeEntries.length === 0) return [];
    
    const productStats = userTimeEntries.reduce((acc, entry) => {
      if (!entry.products) return acc;
      
      const productId = entry.product_id;
      const productName = entry.products.name || 'Unknown Product';
      
      if (!acc[productId]) {
        acc[productId] = { 
          name: productName, 
          type: entry.products.type,
          units: 0,
          revenue: 0 
        };
      }
      
      if (entry.products.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        acc[productId].units += hours;
        acc[productId].revenue += hours * (entry.products.price || 0);
      } else if (entry.products.type === 'item' && entry.quantity) {
        acc[productId].units += entry.quantity;
        acc[productId].revenue += entry.quantity * (entry.products.price || 0);
      }
      
      return acc;
    }, {});
    
    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .map(stat => ({
        name: stat.name,
        type: stat.type,
        units: stat.type === 'activity' ? parseFloat(stat.units.toFixed(1)) : Math.round(stat.units),
        unitLabel: stat.type === 'activity' ? 'hours' : 'units',
        revenue: Math.round(stat.revenue)
      }));
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
                <TableHead isCompact={isCompact}>User</TableHead>
                <TableHead isCompact={isCompact}>Role</TableHead>
                <TableHead isCompact={isCompact}>Hours This Month</TableHead>
                <TableHead isCompact={isCompact}>Revenue This Month</TableHead>
                <TableHead isCompact={isCompact}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell isCompact={isCompact} className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className={isCompact ? "h-6 w-6" : "h-8 w-8"}>
                          <AvatarImage src={user.avatar_url || ""} alt={user.name || "User"} />
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
                    <TableCell isCompact={isCompact}>{getUserHours(user.id)} h</TableCell>
                    <TableCell isCompact={isCompact}>{getUserRevenue(user.id)} SEK</TableCell>
                    <TableCell isCompact={isCompact}>
                      <Button 
                        variant="ghost" 
                        size={isCompact ? "sm" : "default"}
                        onClick={() => handleViewUserStats(user)}
                        className="flex items-center gap-1"
                      >
                        <BarChart className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
                        <span>Stats</span>
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

      {/* User Stats Dialog */}
      <Dialog open={showUserStats} onOpenChange={setShowUserStats}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedUser?.avatar_url || ""} alt={selectedUser?.name || "User"} />
                <AvatarFallback className="bg-primary/10">
                  {(selectedUser?.name?.charAt(0) || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{selectedUser?.name}'s Statistics</span>
            </DialogTitle>
          </DialogHeader>

          {isLoadingUserEntries ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : userTimeEntries.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No data available</AlertTitle>
              <AlertDescription>
                This user doesn't have any time entries or sales recorded yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-lg font-medium mb-3">Client Work Distribution</h3>
                <CustomBarChart
                  data={getUserClientStats()}
                  height={250}
                  barKey="hours"
                  barName="Hours Worked"
                  nameKey="name"
                  barFill="#3b82f6"
                  tooltip={{
                    formatter: (value) => [`${value} hours`, '']
                  }}
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Top Products & Services</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Revenue by Product</h4>
                    <PieChart
                      data={getUserProductStats()}
                      height={200}
                      dataKey="revenue"
                      nameKey="name"
                      colors={['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899']}
                      tooltip={{
                        formatter: (value) => [`${value} SEK`, '']
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Top Products</h4>
                    <div className="space-y-3 mt-4">
                      {getUserProductStats().slice(0, 5).map((product, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.units} {product.unitLabel}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{product.revenue} SEK</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
