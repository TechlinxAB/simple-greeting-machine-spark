import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  BarChart2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, PieChart } from "@/components/dashboard/CustomCharts";

interface UserStatsProps {
  userId: string;
  onBack: () => void;
  isCompact?: boolean;
}

export function UserStats({ userId, onBack, isCompact }: UserStatsProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const formattedMonthYear = format(currentDate, "MMMM yyyy");
  
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1));
  };

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role, avatar_url")
        .eq("id", userId)
        .single();
        
      if (error) throw error;
      return data;
    }
  });

  const { data: userEmail } = useQuery({
    queryKey: ["user-email", userId],
    queryFn: async () => {
      try {
        const { data } = await supabase.functions.invoke('get-all-users');
        const userWithEmail = Array.isArray(data) 
          ? data.find((u: any) => u.id === userId) 
          : null;
        return userWithEmail?.email || "No email available";
      } catch (error) {
        console.error("Error getting user email:", error);
        return "No email available";
      }
    },
    enabled: !!userId
  });

  const { data: timeEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["user-time-entries", userId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, start_time, end_time, quantity, description, created_at,
          products:product_id (id, name, type, price),
          clients:client_id (id, name)
        `)
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const totalHours = timeEntries.reduce((total, entry) => {
    if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }
    return total;
  }, 0).toFixed(1);

  const totalRevenue = timeEntries.reduce((total, entry) => {
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

  const totalEntries = timeEntries.length;

  const prepareClientData = () => {
    const clientMap = new Map();
    
    timeEntries.forEach(entry => {
      const clientName = entry.clients?.name || 'Unknown';
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, 0);
      }
      
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        clientMap.set(clientName, clientMap.get(clientName) + hours);
      }
    });
    
    return Array.from(clientMap.entries()).map(([name, hours]) => {
      const displayName = name.length > 20 ? `${name.substring(0, 20)}...` : name;
      
      return { 
        name: displayName, 
        fullName: name, 
        hours: parseFloat(Number(hours).toFixed(1))
      };
    });
  };

  const prepareActivityData = () => {
    const activityMap = new Map();
    
    timeEntries.forEach(entry => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const activityName = entry.products.name || 'Unknown';
        if (!activityMap.has(activityName)) {
          activityMap.set(activityName, 0);
        }
        
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        activityMap.set(activityName, activityMap.get(activityName) + hours);
      }
    });
    
    return Array.from(activityMap.entries()).map(([name, hours]) => {
      const displayName = name.length > 20 ? `${name.substring(0, 20)}...` : name;
      
      return { 
        name: displayName, 
        fullName: name, 
        hours: parseFloat(Number(hours).toFixed(1))
      };
    });
  };

  const prepareDailyActivityData = () => {
    const daysInMonth = endDate.getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      hours: 0
    }));
    
    timeEntries.forEach(entry => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const date = new Date(entry.start_time);
        const day = date.getDate() - 1;
        
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        dailyData[day].hours += hours;
      }
    });
    
    return dailyData.map(item => ({
      ...item,
      hours: parseFloat(item.hours.toFixed(1))
    }));
  };

  const clientData = prepareClientData();
  const activityData = prepareActivityData();
  const dailyData = prepareDailyActivityData();
  
  const isLoading = userLoading || entriesLoading;
  const COLORS = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#10B981', '#6366F1', '#EC4899'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1"
          onClick={onBack}
        >
          <ArrowLeft className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          <span>Back to Users</span>
        </Button>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            className={isCompact ? "h-8 w-8 p-0" : "h-9 w-9 p-0"}
          >
            <ChevronLeft className={isCompact ? "h-4 w-4" : "h-5 w-5"} />
            <span className="sr-only">Previous Month</span>
          </Button>
          
          <span className={`font-medium ${isCompact ? 'text-sm' : 'text-base'}`}>
            {formattedMonthYear}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            className={isCompact ? "h-8 w-8 p-0" : "h-9 w-9 p-0"}
          >
            <ChevronRight className={isCompact ? "h-4 w-4" : "h-5 w-5"} />
            <span className="sr-only">Next Month</span>
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/10">
                  <AvatarImage src={userData?.avatar_url || ""} alt={userData?.name || "User"} />
                  <AvatarFallback className="text-xl bg-primary/10">
                    {(userData?.name?.charAt(0) || userEmail?.charAt(0) || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1">
                  <h2 className="text-xl font-bold">{userData?.name || userEmail?.split('@')[0]}</h2>
                  <p className="text-muted-foreground">{userEmail}</p>
                  <Badge variant={userData?.role === 'admin' ? 'destructive' : userData?.role === 'manager' ? 'blue' : 'secondary'} className="mt-1 capitalize">
                    {userData?.role || 'user'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Hours Logged</p>
                    <h3 className="text-2xl font-bold">{totalHours}</h3>
                  </div>
                  <div className="rounded-full bg-primary/20 p-2">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Revenue Generated</p>
                    <h3 className="text-2xl font-bold">{totalRevenue} SEK</h3>
                  </div>
                  <div className="rounded-full bg-primary/20 p-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Time Entries</p>
                    <h3 className="text-2xl font-bold">{totalEntries}</h3>
                  </div>
                  <div className="rounded-full bg-primary/20 p-2">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className={isCompact ? "text-base" : ""}>Daily Activity</CardTitle>
                <CardDescription>Hours worked per day in {format(currentDate, "MMMM yyyy")}</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart 
                  data={dailyData} 
                  height={300}
                  barKey="hours"
                  nameKey="day"
                  barName="Hours Logged"
                  barFill="#8B5CF6"
                  tooltip={{
                    formatter: (value) => [`${value} hours`, 'Time Spent'],
                    labelFormatter: (label) => `Day ${label}`
                  }}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className={isCompact ? "text-base" : ""}>Client Distribution</CardTitle>
                <CardDescription>Hours worked per client</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="w-full h-[300px]">
                  <PieChart
                    data={clientData}
                    dataKey="hours"
                    nameKey="name"
                    colors={COLORS}
                    tooltip={{
                      formatter: (value, name, entry) => {
                        return [`${value} hours`, entry.payload.fullName || name] as [string, string];
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className={isCompact ? "text-base" : ""}>Activity Types</CardTitle>
                <CardDescription>Hours by activity type</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="w-full h-[300px]">
                  <PieChart
                    data={activityData}
                    dataKey="hours"
                    nameKey="name"
                    colors={COLORS.slice().reverse()}
                    tooltip={{
                      formatter: (value, name, entry) => {
                        return [`${value} hours`, entry.payload.fullName || name] as [string, string];
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
