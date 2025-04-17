
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChartCard, 
  PieChartCard 
} from "@/components/ui/dashboard-chart";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Users,
  Building,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Loader2,
  Calendar,
  TrendingUp,
  Activity,
  Package,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MonthYearSelector } from "@/components/administration/MonthYearSelector";
import { AllTimeToggle } from "@/components/administration/AllTimeToggle";
import { type ProductType } from "@/types";

interface ClientStat {
  name: string;
  hours: number;
  revenue: number;
}

interface ProductStat {
  name: string;
  type: 'activity' | 'item';
  units: number;
  unitLabel: string;
  revenue: number;
  percentage?: number;
  value?: number;
}

interface UserTimeEntry {
  id: string;
  client_id: string;
  product_id: string;
  start_time: string;
  end_time: string;
  quantity: number;
  clients?: {
    id: string;
    name: string;
  };
  products?: {
    id: string;
    name: string;
    type: ProductType;
    price: number;
  };
}

export default function UserStats() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isAllTime, setIsAllTime] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Fetch user profile data
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role, avatar_url")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Calculate date ranges
  const currentMonthStart = startOfMonth(currentDate);
  const currentMonthEnd = endOfMonth(currentDate);
  
  // Fetch current month time entries
  const { data: currentMonthTimeEntries = [], isLoading: isLoadingCurrentMonth } = useQuery({
    queryKey: ["user-time-entries", userId, "month", format(currentMonthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, client_id, product_id, start_time, end_time, quantity,
          products:product_id (id, name, type, price),
          clients:client_id (id, name)
        `)
        .eq("user_id", userId)
        .gte("start_time", currentMonthStart.toISOString())
        .lte("end_time", currentMonthEnd.toISOString());
        
      if (error) throw error;
      return data as unknown as UserTimeEntry[];
    },
    enabled: !!userId
  });
  
  // Fetch all time entries
  const { data: allTimeEntries = [], isLoading: isLoadingAllTime } = useQuery({
    queryKey: ["user-time-entries", userId, "all-time"],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, client_id, product_id, start_time, end_time, quantity,
          products:product_id (id, name, type, price),
          clients:client_id (id, name)
        `)
        .eq("user_id", userId);
        
      if (error) throw error;
      return data as unknown as UserTimeEntry[];
    },
    enabled: !!userId && isAllTime
  });

  // Calculate hours from time entries
  const calculateHours = (entries: UserTimeEntry[]) => {
    return entries
      .filter(entry => entry.products?.type === 'activity' && entry.start_time && entry.end_time)
      .reduce((total, entry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0).toFixed(1);
  };

  // Calculate revenue from time entries
  const calculateRevenue = (entries: UserTimeEntry[]) => {
    return entries
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

  // Get client statistics from time entries
  const getClientStats = (entries: UserTimeEntry[]): ClientStat[] => {
    if (entries.length === 0) return [];
    
    const clientStats: Record<string, ClientStat> = {};
    
    entries.forEach(entry => {
      const clientId = entry.client_id;
      const clientName = entry.clients?.name || 'Unknown Client';
      
      if (!clientStats[clientId]) {
        clientStats[clientId] = { name: clientName, hours: 0, revenue: 0 };
      }
      
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        clientStats[clientId].hours += hours;
        clientStats[clientId].revenue += hours * (entry.products?.price || 0);
      } else if (entry.products?.type === 'item' && entry.quantity) {
        clientStats[clientId].revenue += entry.quantity * (entry.products?.price || 0);
      }
    });
    
    return Object.values(clientStats)
      .sort((a, b) => b.hours - a.hours)
      .map(stat => ({
        name: stat.name,
        hours: parseFloat(stat.hours.toFixed(1)),
        revenue: Math.round(stat.revenue)
      }));
  };
  
  // Get product statistics from time entries
  const getProductStats = (entries: UserTimeEntry[]): ProductStat[] => {
    if (entries.length === 0) return [];
    
    const productStats: Record<string, Partial<ProductStat>> = {};
    let totalActivityUnits = 0;
    let totalItemUnits = 0;
    
    entries.forEach(entry => {
      if (!entry.products) return;
      
      const productId = entry.product_id || '';
      const productName = entry.products.name || 'Unknown Product';
      
      if (!productStats[productId]) {
        productStats[productId] = { 
          name: productName, 
          type: entry.products.type as 'activity' | 'item',
          units: 0,
          unitLabel: entry.products.type === 'activity' ? 'hours' : 'units',
          revenue: 0 
        };
      }
      
      if (entry.products.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        productStats[productId].units = (productStats[productId].units || 0) + hours;
        productStats[productId].revenue = (productStats[productId].revenue || 0) + hours * (entry.products.price || 0);
        totalActivityUnits += hours;
      } else if (entry.products.type === 'item' && entry.quantity) {
        productStats[productId].units = (productStats[productId].units || 0) + entry.quantity;
        productStats[productId].revenue = (productStats[productId].revenue || 0) + entry.quantity * (entry.products.price || 0);
        totalItemUnits += entry.quantity;
      }
    });
    
    const result = Object.values(productStats).map(stat => {
      const totalUnits = stat.type === 'activity' ? totalActivityUnits : totalItemUnits;
      return {
        name: stat.name || '',
        type: stat.type || 'item',
        units: stat.type === 'activity' ? parseFloat((stat.units || 0).toFixed(1)) : Math.round(stat.units || 0),
        unitLabel: stat.unitLabel || 'units',
        revenue: Math.round(stat.revenue || 0),
        percentage: totalUnits > 0 ? Math.round(((stat.units || 0) / totalUnits) * 100) : 0,
        value: stat.units || 0
      } as ProductStat;
    });
    
    return result.sort((a, b) => b.units - a.units);
  };

  // Filter product statistics by type
  const getProductStatsByType = (stats: ProductStat[], type: 'activity' | 'item'): ProductStat[] => {
    const filteredStats = stats
      .filter(stat => stat.type === type)
      .sort((a, b) => b.units - a.units);
    
    const totalUnits = filteredStats.reduce((sum, stat) => sum + stat.units, 0);
    
    return filteredStats.map(stat => ({
      ...stat,
      units: type === 'activity' ? parseFloat(stat.units.toFixed(1)) : Math.round(stat.units),
      value: stat.units,
      percentage: totalUnits > 0 ? Math.round((stat.units / totalUnits) * 100) : 0
    })) as ProductStat[];
  };

  // Month navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleGoBack = () => {
    navigate('/administration?tab=users');
  };

  // Handle month and year change
  const handleMonthYearChange = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  // Toggle between current month and all time views
  const handleAllTimeToggle = (enabled: boolean) => {
    setIsAllTime(enabled);
  };

  // Calculate statistics for active view
  const currentMonthHours = calculateHours(currentMonthTimeEntries);
  const currentMonthRevenue = calculateRevenue(currentMonthTimeEntries);
  const allTimeHours = calculateHours(allTimeEntries);
  const allTimeRevenue = calculateRevenue(allTimeEntries);
  
  const currentMonthClientStats = getClientStats(currentMonthTimeEntries);
  const allTimeClientStats = getClientStats(allTimeEntries);
  
  const currentMonthProductStats = getProductStats(currentMonthTimeEntries);
  const allTimeProductStats = getProductStats(allTimeEntries);

  const currentMonthActivityStats = getProductStatsByType(currentMonthProductStats, 'activity');
  const currentMonthItemStats = getProductStatsByType(currentMonthProductStats, 'item');
  const allTimeActivityStats = getProductStatsByType(allTimeProductStats, 'activity');
  const allTimeItemStats = getProductStatsByType(allTimeProductStats, 'item');

  // Get top 5 clients by hours
  const getTopClients = (clientStats: ClientStat[]) => {
    return clientStats.slice(0, 5);
  };

  // Get top 5 products by revenue
  const getTopRevenueProducts = (productStats: ProductStat[]) => {
    return [...productStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  };

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (!profile) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            User not found or you don't have permission to view this user's data.
          </AlertDescription>
        </Alert>
        <Button onClick={handleGoBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Administration
        </Button>
      </div>
    );
  }

  // Define role badge variants
  const roleBadgeVariants = {
    admin: "destructive",
    manager: "blue",
    user: "secondary",
  };
  
  // Choose active statistics based on view
  const activeStats = isAllTime 
    ? { 
        clientStats: allTimeClientStats,
        activityStats: allTimeActivityStats,
        itemStats: allTimeItemStats,
        productStats: allTimeProductStats,
        hours: allTimeHours,
        revenue: allTimeRevenue,
        entries: allTimeEntries,
        isLoading: isLoadingAllTime
      } 
    : {
        clientStats: currentMonthClientStats,
        activityStats: currentMonthActivityStats,
        itemStats: currentMonthItemStats,
        productStats: currentMonthProductStats,
        hours: currentMonthHours,
        revenue: currentMonthRevenue,
        entries: currentMonthTimeEntries,
        isLoading: isLoadingCurrentMonth
      };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleGoBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">User Performance Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {!isAllTime && (
            <div className="flex items-center bg-white dark:bg-slate-800 border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
                className="h-9 w-9 rounded-r-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{format(currentDate, 'MMMM yyyy')}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                className="h-9 w-9 rounded-l-none"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <AllTimeToggle 
            isAllTime={isAllTime} 
            onAllTimeChange={handleAllTimeToggle} 
          />
        </div>
      </div>
      
      <div className="container mx-auto py-6 px-4">
        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* User Profile Sidebar */}
          <div className="col-span-12 md:col-span-3">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-32 flex items-center justify-center">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "User"} />
                  <AvatarFallback className="text-2xl bg-white text-green-600">
                    {(profile?.name?.charAt(0) || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">{profile?.name}</h3>
                  <Badge 
                    variant={roleBadgeVariants[profile?.role as keyof typeof roleBadgeVariants] as any || "secondary"} 
                    className="mt-1"
                  >
                    <span className="capitalize">{profile?.role}</span>
                  </Badge>
                </div>
                
                <div className="space-y-4 mt-4">
                  {/* Key summary stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-xl font-bold text-green-600">{allTimeHours}h</p>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-xl font-bold text-green-600">{Number(allTimeRevenue).toLocaleString()} kr</p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-1 text-green-600" />
                      <span>Total Clients</span>
                    </h4>
                    <p className="text-2xl font-bold text-green-600">{allTimeClientStats.length}</p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Activity className="h-4 w-4 mr-1 text-green-600" />
                      <span>Services</span>
                    </h4>
                    <p className="text-2xl font-bold text-green-600">{allTimeActivityStats.length}</p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Package className="h-4 w-4 mr-1 text-green-600" />
                      <span>Products</span>
                    </h4>
                    <p className="text-2xl font-bold text-green-600">{allTimeItemStats.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Stats Area */}
          <div className="col-span-12 md:col-span-9 space-y-6">
            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-green-100 mb-1">Hours Tracked</p>
                    <h3 className="text-3xl font-bold">{activeStats.hours}h</h3>
                    <p className="text-green-100 text-sm mt-1">
                      {isAllTime ? 'All Time' : format(currentDate, 'MMMM yyyy')}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Clock className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-600 to-emerald-700 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-green-100 mb-1">Total Revenue</p>
                    <h3 className="text-3xl font-bold">{Number(activeStats.revenue).toLocaleString()} kr</h3>
                    <p className="text-green-100 text-sm mt-1">
                      {isAllTime ? 'All Time' : format(currentDate, 'MMMM yyyy')}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <DollarSign className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-green-100 mb-1">Active Clients</p>
                    <h3 className="text-3xl font-bold">{activeStats.clientStats.length}</h3>
                    <p className="text-green-100 text-sm mt-1">
                      {activeStats.clientStats.length > 0 ? `Top: ${activeStats.clientStats[0]?.name.substring(0, 15)}${activeStats.clientStats[0]?.name.length > 15 ? '...' : ''}` : 'No clients yet'}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Building className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {activeStats.isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-green-600" />
              </div>
            ) : activeStats.entries.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No data available</AlertTitle>
                <AlertDescription>
                  {isAllTime 
                    ? 'No time entries found for this user.' 
                    : `No time entries found for ${format(currentDate, 'MMMM yyyy')}.`}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Client Work Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BarChartCard
                    title="Hours per Client"
                    description={isAllTime ? "All time distribution" : `Distribution for ${format(currentDate, 'MMMM yyyy')}`}
                    data={activeStats.clientStats}
                    height={320}
                    barKey="hours"
                    barName="Hours Worked"
                    barFill="#10b981"
                    tooltip={{
                      formatter: (value) => [`${value} hours`, '']
                    }}
                    className="col-span-1"
                  />
                  
                  <BarChartCard
                    title="Revenue per Client"
                    description={isAllTime ? "All time revenue" : `Revenue for ${format(currentDate, 'MMMM yyyy')}`}
                    data={activeStats.clientStats}
                    height={320}
                    barKey="revenue"
                    barName="Revenue (SEK)"
                    barFill="#047857"
                    tooltip={{
                      formatter: (value) => [`${Number(value).toLocaleString()} kr`, '']
                    }}
                    className="col-span-1"
                  />
                </div>
                
                {/* Services and Products Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Activity/Services Chart */}
                  {activeStats.activityStats.length > 0 && (
                    <PieChartCard
                      title="Service Distribution"
                      description={`Hours tracked per service type ${isAllTime ? 'all time' : `in ${format(currentDate, 'MMMM yyyy')}`}`}
                      data={activeStats.activityStats.map(item => ({...item, value: item.units}))}
                      height={280}
                      dataKey="value"
                      colors={['#10b981', '#047857', '#065f46', '#064e3b', '#022c22']}
                      tooltip={{
                        formatter: (value) => {
                          const stat = activeStats.activityStats.find(s => s.units === value);
                          const percentage = stat ? `${stat.percentage}%` : '';
                          return [`${value} hours (${percentage})`, ''];
                        }
                      }}
                      showLabels={true}
                      outerRadius={130}
                      hideOuterLabels={true}
                      className="col-span-1"
                    />
                  )}
                  
                  {/* Products Chart */}
                  {activeStats.itemStats.length > 0 && (
                    <PieChartCard
                      title="Product Distribution"
                      description={`Units sold per product ${isAllTime ? 'all time' : `in ${format(currentDate, 'MMMM yyyy')}`}`}
                      data={activeStats.itemStats.map(item => ({...item, value: item.units}))}
                      height={280}
                      dataKey="value"
                      colors={['#10b981', '#047857', '#065f46', '#064e3b', '#022c22']}
                      tooltip={{
                        formatter: (value) => {
                          const stat = activeStats.itemStats.find(s => s.units === value);
                          const percentage = stat ? `${stat.percentage}%` : '';
                          return [`${value} units (${percentage})`, ''];
                        }
                      }}
                      showLabels={true}
                      outerRadius={130}
                      hideOuterLabels={true}
                      className="col-span-1"
                    />
                  )}
                </div>
                
                {/* Tables for detailed data */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Top Clients */}
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-green-600 mr-2" />
                        <CardTitle>Top Clients</CardTitle>
                      </div>
                      <CardDescription>
                        Clients with the most hours logged {isAllTime ? 'all time' : `in ${format(currentDate, 'MMMM yyyy')}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Client Name</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Revenue (kr)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getTopClients(activeStats.clientStats).map((client, index) => (
                            <TableRow key={index} className="hover:bg-green-50/50 dark:hover:bg-green-950/20">
                              <TableCell className="font-medium">{client.name}</TableCell>
                              <TableCell className="text-right">{client.hours}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">{client.revenue.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          {activeStats.clientStats.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                No client data available for this period.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  {/* Top Revenue Products */}
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <div className="flex items-center">
                        <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                        <CardTitle>Top Revenue Generators</CardTitle>
                      </div>
                      <CardDescription>
                        Products and services generating the most revenue {isAllTime ? 'all time' : `in ${format(currentDate, 'MMMM yyyy')}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Units</TableHead>
                            <TableHead className="text-right">Revenue (kr)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getTopRevenueProducts(activeStats.productStats).map((product, index) => (
                            <TableRow key={index} className="hover:bg-green-50/50 dark:hover:bg-green-950/20">
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>
                                <Badge variant={product.type === 'activity' ? "secondary" : "outline"} className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800">
                                  {product.type === 'activity' ? 'Service' : 'Product'}
                                </Badge>
                              </TableCell>
                              <TableCell>{product.units} {product.unitLabel}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">{product.revenue.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          {activeStats.productStats.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                No product data available for this period.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
