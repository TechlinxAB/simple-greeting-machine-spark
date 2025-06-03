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
import { useTranslation } from "react-i18next";

interface ClientStat {
  name: string;
  hours: number;
  revenue: number;
}

interface ProductStat {
  name: string;
  type: 'activity' | 'product';
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
  created_at: string;
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
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isAllTime, setIsAllTime] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'this-month' | 'all-time'>('this-month');
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
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
    queryKey: ["user-time-entries", userId, "month", format(currentMonthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, client_id, product_id, start_time, end_time, quantity, created_at,
          products:product_id (id, name, type, price),
          clients:client_id (id, name)
        `)
        .eq("user_id", userId)
        .gte("created_at", currentMonthStart.toISOString())
        .lte("created_at", currentMonthEnd.toISOString());
        
      if (error) throw error;
      console.log("Current month entries:", data);
      
      // Transform the data to convert "item" to "product"
      return (data || []).map(entry => ({
        ...entry,
        products: entry.products ? {
          ...entry.products,
          type: entry.products.type === 'item' ? 'product' : entry.products.type as ProductType
        } : undefined
      })) as unknown as UserTimeEntry[];
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
          id, client_id, product_id, start_time, end_time, quantity, created_at,
          products:product_id (id, name, type, price),
          clients:client_id (id, name)
        `)
        .eq("user_id", userId);
        
      if (error) throw error;
      console.log("All time entries:", data);
      
      // Transform the data to convert "item" to "product"
      return (data || []).map(entry => ({
        ...entry,
        products: entry.products ? {
          ...entry.products,
          type: entry.products.type === 'item' ? 'product' : entry.products.type as ProductType
        } : undefined
      })) as unknown as UserTimeEntry[];
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
        } else if (entry.products?.type === 'product' && entry.quantity) {
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
      } else if (entry.products?.type === 'product' && entry.quantity) {
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

  const getActivityStats = (entries: UserTimeEntry[]): ProductStat[] => {
    if (entries.length === 0) return [];
    
    const activityStats: Record<string, Partial<ProductStat>> = {};
    let totalHours = 0;
    
    entries.forEach(entry => {
      if (!entry.products || entry.products.type !== 'activity' || !entry.start_time || !entry.end_time) return;
      
      const productId = entry.product_id;
      const productName = entry.products.name || 'Unknown Service';
      
      if (!activityStats[productId]) {
        activityStats[productId] = { 
          name: productName, 
          type: 'activity' as const,
          units: 0,
          unitLabel: 'hours',
          revenue: 0 
        };
      }
      
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      activityStats[productId].units = (activityStats[productId].units || 0) + hours;
      activityStats[productId].revenue = (activityStats[productId].revenue || 0) + hours * (entry.products.price || 0);
      totalHours += hours;
    });
    
    return Object.values(activityStats)
      .map(stat => ({
        name: stat.name || '',
        type: 'activity' as const,
        units: parseFloat((stat.units || 0).toFixed(1)),
        unitLabel: 'hours',
        revenue: Math.round(stat.revenue || 0),
        percentage: totalHours > 0 ? Math.round(((stat.units || 0) / totalHours) * 100) : 0,
        value: parseFloat((stat.units || 0).toFixed(1))
      }))
      .sort((a, b) => b.units - a.units);
  };
  
  const getProductStats = (entries: UserTimeEntry[]): ProductStat[] => {
    if (entries.length === 0) return [];
    
    const productStats: Record<string, Partial<ProductStat>> = {};
    let totalUnits = 0;
    
    entries.forEach(entry => {
      if (!entry.products || entry.products.type !== 'product') return;
      
      const quantity = entry.quantity || 0;
      if (quantity <= 0) return;
      
      const productId = entry.product_id;
      const productName = entry.products.name || 'Unknown Product';
      
      if (!productStats[productId]) {
        productStats[productId] = { 
          name: productName, 
          type: 'product' as const,
          units: 0,
          unitLabel: 'units',
          revenue: 0 
        };
      }
      
      productStats[productId].units = (productStats[productId].units || 0) + quantity;
      productStats[productId].revenue = (productStats[productId].revenue || 0) + quantity * (entry.products.price || 0);
      totalUnits += quantity;
    });
    
    console.log("Product stats before processing:", productStats);
    
    return Object.values(productStats)
      .map(stat => ({
        name: stat.name || '',
        type: 'product' as const,
        units: Math.round(stat.units || 0),
        unitLabel: 'units',
        revenue: Math.round(stat.revenue || 0),
        percentage: totalUnits > 0 ? Math.round(((stat.units || 0) / totalUnits) * 100) : 0,
        value: Math.round(stat.units || 0)
      }))
      .sort((a, b) => b.units - a.units);
  };
  
  const getAllProductStats = (entries: UserTimeEntry[]): ProductStat[] => {
    const activityStats = getActivityStats(entries);
    const productStats = getProductStats(entries);
    return [...activityStats, ...productStats];
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

  const handleMonthYearChange = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleAllTimeToggle = (enabled: boolean) => {
    setIsAllTime(enabled);
    setActiveTab(enabled ? 'all-time' : 'this-month');
  };

  const currentMonthHours = calculateHours(currentMonthTimeEntries);
  const currentMonthRevenue = calculateRevenue(currentMonthTimeEntries);
  const allTimeHours = calculateHours(allTimeEntries);
  const allTimeRevenue = calculateRevenue(allTimeEntries);
  
  const currentMonthClientStats = getClientStats(currentMonthTimeEntries);
  const allTimeClientStats = getClientStats(allTimeEntries);
  
  const currentMonthActivityStats = getActivityStats(currentMonthTimeEntries);
  const currentMonthProductStats = getProductStats(currentMonthTimeEntries);
  const allTimeActivityStats = getActivityStats(allTimeEntries);
  const allTimeProductStats = getProductStats(allTimeEntries);

  console.log("Current month product stats:", currentMonthProductStats);
  console.log("All time product stats:", allTimeProductStats);

  const getTopClients = (clientStats: ClientStat[]) => {
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
          <AlertTitle>{t("error.somethingWentWrong")}</AlertTitle>
          <AlertDescription>
            {t("error.unauthorized")}
          </AlertDescription>
        </Alert>
        <Button onClick={handleGoBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")} {t("administration.title")}
        </Button>
      </div>
    );
  }

  const roleBadgeVariants = {
    admin: "destructive",
    manager: "blue",
    user: "secondary",
  };
  
  const activeStats = isAllTime 
    ? { 
        clientStats: allTimeClientStats,
        activityStats: allTimeActivityStats,
        productStats: allTimeProductStats,
        hours: allTimeHours,
        revenue: allTimeRevenue,
        entries: allTimeEntries,
        isLoading: isLoadingAllTime
      } 
    : {
        clientStats: currentMonthClientStats,
        activityStats: currentMonthActivityStats,
        productStats: currentMonthProductStats,
        hours: currentMonthHours,
        revenue: currentMonthRevenue,
        entries: currentMonthTimeEntries,
        isLoading: isLoadingCurrentMonth
      };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
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
          <h1 className="text-xl font-semibold">{t("userStats.title")}</h1>
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
        <div className="grid grid-cols-12 gap-6">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">{t("userStats.totalHours")}</p>
                      <p className="text-xl font-bold text-green-600">{allTimeHours}h</p>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">{t("userStats.revenue")}</p>
                      <p className="text-xl font-bold text-green-600">{Number(allTimeRevenue).toLocaleString()} kr</p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-1 text-green-600" />
                      <span>{t("clients.title")}</span>
                    </h4>
                    <p className="text-2xl font-bold text-green-600">{allTimeClientStats.length}</p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Activity className="h-4 w-4 mr-1 text-green-600" />
                      <span>{t("products.activities")}</span>
                    </h4>
                    <p className="text-2xl font-bold text-green-600">{allTimeActivityStats.length}</p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Package className="h-4 w-4 mr-1 text-green-600" />
                      <span>{t("products.items")}</span>
                    </h4>
                    <p className="text-2xl font-bold text-green-600">{allTimeProductStats.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="col-span-12 md:col-span-9 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-green-100 mb-1">{t("userStats.hoursPerClient")}</p>
                    <h3 className="text-3xl font-bold">{activeStats.hours}h</h3>
                    <p className="text-green-100 text-sm mt-1">
                      {isAllTime ? t("common.allTime") : format(currentDate, 'MMMM yyyy')}
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
                    <p className="text-green-100 mb-1">{t("userStats.totalRevenue")}</p>
                    <h3 className="text-3xl font-bold">{Number(activeStats.revenue).toLocaleString()} kr</h3>
                    <p className="text-green-100 text-sm mt-1">
                      {isAllTime ? t("common.allTime") : format(currentDate, 'MMMM yyyy')}
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
                    <p className="text-green-100 mb-1">{t("userStats.mostActiveClients")}</p>
                    <h3 className="text-3xl font-bold">{activeStats.clientStats.length}</h3>
                    <p className="text-green-100 text-sm mt-1">
                      {activeStats.clientStats.length > 0 ? `${t("userStats.topClients")}: ${activeStats.clientStats[0]?.name.substring(0, 15)}${activeStats.clientStats[0]?.name.length > 15 ? '...' : ''}` : t("clients.noClientsFound")}
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
                <AlertTitle>{t("reports.noDataAvailable")}</AlertTitle>
                <AlertDescription>
                  {isAllTime 
                    ? t("timeTracking.noTimeEntries") 
                    : `${t("timeTracking.noTimeEntries")} ${format(currentDate, 'MMMM yyyy')}.`}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BarChartCard
                    title={t("userStats.hoursPerClient")}
                    description={isAllTime ? t("userStats.clientDistribution") : `${t("userStats.clientDistribution")} ${format(currentDate, 'MMMM yyyy')}`}
                    data={activeStats.clientStats}
                    height={320}
                    barKey="hours"
                    barName={t("common.hours")}
                    barFill="#10b981"
                    tooltip={{
                      formatter: (value) => [`${value} ${t("common.hours")}`, '']
                    }}
                    className="col-span-1"
                  />
                  
                  <BarChartCard
                    title={t("userStats.revenuePerClient")}
                    description={isAllTime ? t("userStats.clientDistribution") : `${t("userStats.clientDistribution")} ${format(currentDate, 'MMMM yyyy')}`}
                    data={activeStats.clientStats}
                    height={320}
                    barKey="revenue"
                    barName={t("invoices.amount")}
                    barFill="#047857"
                    tooltip={{
                      formatter: (value) => [`${Number(value).toLocaleString()} kr`, '']
                    }}
                    className="col-span-1"
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b pb-3">
                      <CardTitle>{t("userStats.activityBreakdown")}</CardTitle>
                      <CardDescription>
                        {isAllTime ? t("timeTracking.activitiesFor") + ' ' + t("common.allTime") : t("timeTracking.activitiesFor") + ' ' + format(currentDate, 'MMMM yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-[350px]">
                        {activeStats.activityStats.length > 0 ? (
                          <PieChartCard
                            title=""
                            data={activeStats.activityStats.map(item => ({...item, value: item.units}))}
                            height={350}
                            dataKey="value"
                            colors={['#10b981', '#047857', '#065f46', '#064e3b', '#022c22']}
                            tooltip={{
                              formatter: (value) => {
                                const stat = activeStats.activityStats.find(s => s.units === value);
                                const percentage = stat ? `${stat.percentage}%` : '';
                                return [`${value} ${t("common.hours")} (${percentage})`, ''];
                              }
                            }}
                            showLabels={true}
                            outerRadius={120}
                            hideOuterLabels={false}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">{t("reports.noDataAvailable")}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b pb-3">
                      <CardTitle>{t("userStats.productDistribution")}</CardTitle>
                      <CardDescription>
                        {isAllTime ? t("userStats.productDistribution") + ' ' + t("common.allTime") : t("userStats.productDistribution") + ' ' + format(currentDate, 'MMMM yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-[350px]">
                        {activeStats.productStats.length > 0 ? (
                          <PieChartCard
                            title=""
                            data={activeStats.productStats.map(item => ({...item, value: item.units}))}
                            height={350}
                            dataKey="value"
                            colors={['#10b981', '#047857', '#065f46', '#064e3b', '#022c22']}
                            tooltip={{
                              formatter: (value) => {
                                const stat = activeStats.productStats.find(s => s.units === value);
                                const percentage = stat ? `${stat.percentage}%` : '';
                                return [`${value} ${t("common.units")} (${percentage})`, ''];
                              }
                            }}
                            showLabels={true}
                            outerRadius={120}
                            hideOuterLabels={false}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">{t("reports.noDataAvailable")}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-green-600 mr-2" />
                        <CardTitle>{t("userStats.topClients")}</CardTitle>
                      </div>
                      <CardDescription>
                        {isAllTime ? t("userStats.clientDistribution") + ' ' + t("common.allTime") : t("userStats.clientDistribution") + ' ' + format(currentDate, 'MMMM yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>{t("clients.clientName")}</TableHead>
                            <TableHead className="text-right">{t("common.hours")}</TableHead>
                            <TableHead className="text-right">{t("invoices.amount")} (kr)</TableHead>
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
                                {t("reports.noDataAvailable")}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <div className="flex items-center">
                        <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                        <CardTitle>{t("userStats.topActivities")}</CardTitle>
                      </div>
                      <CardDescription>
                        {isAllTime 
                          ? t("userStats.performanceMetrics") + ' ' + t("common.allTime") 
                          : t("userStats.performanceMetrics") + ' ' + format(currentDate, 'MMMM yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>{t("common.name")}</TableHead>
                            <TableHead>{t("common.type")}</TableHead>
                            <TableHead className="text-right">{t("common.quantity")}</TableHead>
                            <TableHead className="text-right">{t("invoices.amount")} (kr)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getTopRevenueProducts([...activeStats.activityStats, ...activeStats.productStats]).map((product, index) => (
                            <TableRow key={index} className="hover:bg-green-50/50 dark:hover:bg-green-950/20">
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.type === 'activity' ? t("products.activity") : t("products.item")}</TableCell>
                              <TableCell className="text-right">
                                {product.units} {product.type === 'activity' ? t("common.hours") : t("common.units")}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">{product.revenue.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          {[...activeStats.activityStats, ...activeStats.productStats].length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                {t("reports.noDataAvailable")}
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
