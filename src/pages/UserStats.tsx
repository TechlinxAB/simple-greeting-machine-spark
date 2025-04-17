
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { BarChart as CustomBarChart, PieChart as CustomPieChart } from "@/components/dashboard/CustomCharts";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  BarChart,
  PieChart as PieChartIcon,
  AlertCircle,
  Loader2,
  Tag,
  Clock4,
  ListFilter,
  Users,
  TrendingUp,
  Activity,
  Package
} from "lucide-react";
import { useIsLaptop } from "@/hooks/use-mobile";
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
  const isLaptop = useIsLaptop();
  const [activeTab, setActiveTab] = useState("current-month");
  const [currentDate, setCurrentDate] = useState(new Date());
  
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

  const currentMonthStart = startOfMonth(currentDate);
  const currentMonthEnd = endOfMonth(currentDate);
  
  const { data: currentMonthTimeEntries = [], isLoading: isLoadingCurrentMonth } = useQuery({
    queryKey: ["user-time-entries", userId, "current-month", format(currentMonthStart, "yyyy-MM")],
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
    enabled: !!userId
  });

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

  const getProductStatsByType = (stats: ProductStat[], type: 'activity' | 'item'): ProductStat[] => {
    const filteredStats = stats
      .filter(stat => stat.type === type)
      .sort((a, b) => b.units - a.units);
    
    const totalUnits = filteredStats.reduce((sum, stat) => sum + stat.units, 0);
    
    return filteredStats.map(stat => ({
      ...stat,
      name: stat.name,
      units: type === 'activity' ? parseFloat(stat.units.toFixed(1)) : Math.round(stat.units),
      value: stat.units,
      percentage: totalUnits > 0 ? Math.round((stat.units / totalUnits) * 100) : 0
    })) as ProductStat[];
  };

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleGoBack = () => {
    navigate('/administration?tab=users');
  };

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

  const getLatestClients = (clientStats: ClientStat[]) => {
    return clientStats.slice(0, 5);
  };

  const getTopRevenueProducts = (productStats: ProductStat[]) => {
    return [...productStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  const roleColors = {
    admin: "text-red-600",
    manager: "text-blue-600",
    user: "text-gray-600"
  };

  const roleBadgeVariants = {
    admin: "destructive",
    manager: "blue",
    user: "secondary",
  };
  
  const activeStats = activeTab === 'current-month' 
    ? { 
        clientStats: currentMonthClientStats,
        activityStats: currentMonthActivityStats,
        itemStats: currentMonthItemStats,
        productStats: currentMonthProductStats,
        hours: currentMonthHours,
        revenue: currentMonthRevenue,
        entries: currentMonthTimeEntries,
        isLoading: isLoadingCurrentMonth
      } 
    : {
        clientStats: allTimeClientStats,
        activityStats: allTimeActivityStats,
        itemStats: allTimeItemStats,
        productStats: allTimeProductStats,
        hours: allTimeHours,
        revenue: allTimeRevenue,
        entries: allTimeEntries,
        isLoading: isLoadingAllTime
      };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b shadow-sm p-3 flex items-center justify-between">
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
        
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mr-4">
            <TabsList className="bg-slate-100 dark:bg-slate-700">
              <TabsTrigger value="current-month" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                Current Month
              </TabsTrigger>
              <TabsTrigger value="all-time" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {activeTab === 'current-month' && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{format(currentDate, 'MMMM yyyy')}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - User Info */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-20">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-24 flex items-center justify-center">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                    <AvatarImage src={profile?.avatar_url || ""} alt={profile?.name || "User"} />
                    <AvatarFallback className="text-2xl bg-white text-indigo-600">
                      {(profile?.name?.charAt(0) || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardContent className="pt-10">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold">{profile?.name}</h3>
                    <Badge 
                      variant={roleBadgeVariants[profile?.role as keyof typeof roleBadgeVariants] as any || "secondary"} 
                      className="mt-1"
                    >
                      <span className="capitalize">{profile?.role}</span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Since</p>
                        <p className="font-medium">January 2023</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Total Clients</p>
                        <p className="font-medium">{allTimeClientStats.length}</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Total Hours</p>
                        <div className="flex items-center text-xl font-bold text-green-600">
                          <Clock className="mr-1 h-5 w-5" />
                          <span>{allTimeHours}h</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <div className="flex items-center text-xl font-bold text-blue-600">
                          <DollarSign className="mr-1 h-5 w-5" />
                          <span>{Number(allTimeRevenue).toLocaleString()} SEK</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-blue-100 mb-1">Hours Tracked</p>
                    <h3 className="text-3xl font-bold">{activeStats.hours}h</h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {activeTab === 'current-month' ? format(currentDate, 'MMMM yyyy') : 'All Time'}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Clock className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-green-100 mb-1">Total Revenue</p>
                    <h3 className="text-3xl font-bold">{Number(activeStats.revenue).toLocaleString()} SEK</h3>
                    <p className="text-green-100 text-sm mt-1">
                      {activeTab === 'current-month' ? format(currentDate, 'MMMM yyyy') : 'All Time'}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <DollarSign className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-purple-100 mb-1">Active Services</p>
                    <h3 className="text-3xl font-bold">{activeStats.activityStats.length}</h3>
                    <p className="text-purple-100 text-sm mt-1">
                      {activeStats.activityStats.length > 0 ? `Top: ${activeStats.activityStats[0]?.name.substring(0, 16)}${activeStats.activityStats[0]?.name.length > 16 ? '...' : ''}` : 'No services yet'}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Activity className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-orange-100 mb-1">Active Products</p>
                    <h3 className="text-3xl font-bold">{activeStats.itemStats.length}</h3>
                    <p className="text-orange-100 text-sm mt-1">
                      {activeStats.itemStats.length > 0 ? `Top: ${activeStats.itemStats[0]?.name.substring(0, 16)}${activeStats.itemStats[0]?.name.length > 16 ? '...' : ''}` : 'No products yet'}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Package className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {activeStats.isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : activeStats.entries.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No data available</AlertTitle>
                <AlertDescription>
                  {activeTab === 'current-month' 
                    ? `No time entries found for ${format(currentDate, 'MMMM yyyy')}.` 
                    : 'No time entries found for this user.'}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Client Work Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-primary mr-2" />
                      <CardTitle>Client Work Distribution</CardTitle>
                    </div>
                    <CardDescription>
                      Hours tracked per client {activeTab === 'current-month' ? `in ${format(currentDate, 'MMMM yyyy')}` : 'all time'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <CustomBarChart
                        data={activeStats.clientStats}
                        height={320}
                        barKey="hours"
                        barName="Hours Worked"
                        nameKey="name"
                        barFill="#4ba64b"
                        tooltip={{
                          formatter: (value) => {
                            return [`${value} hours`, ''];
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Revenue by Client */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-primary mr-2" />
                      <CardTitle>Revenue by Client</CardTitle>
                    </div>
                    <CardDescription>
                      Total revenue generated per client {activeTab === 'current-month' ? `in ${format(currentDate, 'MMMM yyyy')}` : 'all time'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <CustomBarChart
                        data={activeStats.clientStats}
                        height={320}
                        barKey="revenue"
                        barName="Revenue (SEK)"
                        nameKey="name"
                        barFill="#3b82f6"
                        tooltip={{
                          formatter: (value) => {
                            return [`${Number(value).toLocaleString()} SEK`, ''];
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Services and Products Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Activity/Services Chart */}
                  {activeStats.activityStats.length > 0 && (
                    <Card className="overflow-hidden border-green-100">
                      <CardHeader className="pb-2 border-b">
                        <div className="flex items-center">
                          <Clock4 className="h-5 w-5 text-green-600 mr-2" />
                          <CardTitle>Service Hour Distribution</CardTitle>
                        </div>
                        <CardDescription>
                          Breakdown of hours by service type
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          <div className="w-full md:w-1/2 pt-4 pl-4 pr-4">
                            <div className="h-[280px]">
                              <CustomPieChart
                                data={activeStats.activityStats.map(item => ({...item, value: item.units}))}
                                height={280}
                                dataKey="value"
                                nameKey="name"
                                colors={['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899']}
                                tooltip={{
                                  formatter: (value) => {
                                    const stat = activeStats.activityStats.find(s => s.units === value);
                                    const percentage = stat ? `${stat.percentage}%` : '';
                                    return [`${value} hours (${percentage})`, ''];
                                  }
                                }}
                                showLabels={false}
                                outerRadius={130}
                              />
                            </div>
                          </div>
                          
                          <div className="w-full md:w-1/2 max-h-[280px] overflow-y-auto p-4">
                            <div className="space-y-3">
                              {activeStats.activityStats.map((service, idx) => (
                                <div key={idx} className="flex items-center p-3 rounded-md bg-green-50 hover:bg-green-100 transition-colors">
                                  <div 
                                    className="w-4 h-4 rounded-full mr-3" 
                                    style={{ backgroundColor: ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'][idx % 5] }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" title={service.name}>{service.name}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-sm text-gray-600">{service.units} hrs</span>
                                      <Badge variant="outline">{service.percentage}%</Badge>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Products Chart */}
                  {activeStats.itemStats.length > 0 && (
                    <Card className="overflow-hidden border-blue-100">
                      <CardHeader className="pb-2 border-b">
                        <div className="flex items-center">
                          <Package className="h-5 w-5 text-blue-600 mr-2" />
                          <CardTitle>Product Unit Distribution</CardTitle>
                        </div>
                        <CardDescription>
                          Breakdown of units by product type
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          <div className="w-full md:w-1/2 pt-4 pl-4 pr-4">
                            <div className="h-[280px]">
                              <CustomPieChart
                                data={activeStats.itemStats.map(item => ({...item, value: item.units}))}
                                height={280}
                                dataKey="value"
                                nameKey="name"
                                colors={['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e']}
                                tooltip={{
                                  formatter: (value) => {
                                    const stat = activeStats.itemStats.find(s => s.units === value);
                                    const percentage = stat ? `${stat.percentage}%` : '';
                                    return [`${value} units (${percentage})`, ''];
                                  }
                                }}
                                showLabels={false}
                                outerRadius={130}
                              />
                            </div>
                          </div>
                          
                          <div className="w-full md:w-1/2 max-h-[280px] overflow-y-auto p-4">
                            <div className="space-y-3">
                              {activeStats.itemStats.map((product, idx) => (
                                <div key={idx} className="flex items-center p-3 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors">
                                  <div 
                                    className="w-4 h-4 rounded-full mr-3" 
                                    style={{ backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'][idx % 5] }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" title={product.name}>{product.name}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-sm text-gray-600">{product.units} units</span>
                                      <Badge variant="outline">{product.percentage}%</Badge>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                {/* Top Revenue Generators */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-primary mr-2" />
                      <CardTitle>Top Revenue Generators</CardTitle>
                    </div>
                    <CardDescription>
                      Products and services generating the most revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Units</TableHead>
                          <TableHead className="text-right">Revenue (SEK)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getTopRevenueProducts(activeStats.productStats).map((product, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              <Badge variant={product.type === 'activity' ? "secondary" : "outline"}>
                                {product.type === 'activity' ? 'Service' : 'Product'}
                              </Badge>
                            </TableCell>
                            <TableCell>{product.units} {product.unitLabel}</TableCell>
                            <TableCell className="text-right font-bold">{product.revenue.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                {/* Latest Clients */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-primary mr-2" />
                      <CardTitle>Top Clients</CardTitle>
                    </div>
                    <CardDescription>
                      Clients with the most hours logged
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Hours Tracked</TableHead>
                          <TableHead className="text-right">Revenue (SEK)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getLatestClients(activeStats.clientStats).map((client, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>{client.hours}</TableCell>
                            <TableCell className="text-right font-bold">{client.revenue.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
