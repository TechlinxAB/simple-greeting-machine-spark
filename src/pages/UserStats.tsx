
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Calendar,
  Clock,
  DollarSign,
  User,
  BarChart2,
  PieChart,
  Users,
  LineChart
} from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInDays, subMonths } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart, PieChart as CustomPieChart } from "@/components/dashboard/CustomCharts";
import { useIsLaptop } from "@/hooks/use-mobile";

export default function UserStats() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isLaptop = useIsLaptop();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [activeTab, setActiveTab] = useState("overview");
  
  const dateLocale = language === 'sv' ? sv : enUS;
  const currentMonth = new Date();
  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);
  const previousMonth = subMonths(currentMonth, 1);
  const previousMonthStart = startOfMonth(previousMonth);
  const previousMonthEnd = endOfMonth(previousMonth);
  
  const { data: userData } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
  
  const { data: currentMonthEntries = [] } = useQuery({
    queryKey: ["time-entries", "current-month", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, start_time, end_time, quantity, client_id, product_id, 
          clients:client_id(id, name),
          products:product_id(id, name, type, price)
        `)
        .eq("user_id", userId)
        .gte("created_at", currentMonthStart.toISOString())
        .lte("created_at", currentMonthEnd.toISOString());
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
  
  const { data: previousMonthEntries = [] } = useQuery({
    queryKey: ["time-entries", "previous-month", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id, start_time, end_time, quantity, product_id, 
          products:product_id(id, name, type, price)
        `)
        .eq("user_id", userId)
        .gte("created_at", previousMonthStart.toISOString())
        .lte("created_at", previousMonthEnd.toISOString());
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
  
  const calculateHours = (entries) => {
    return entries.reduce((total, entry) => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);
  };
  
  const calculateRevenue = (entries) => {
    return entries.reduce((total, entry) => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + (hours * (entry.products.price || 0));
      } else if (entry.products?.type === 'item' && entry.quantity) {
        return total + (entry.quantity * (entry.products.price || 0));
      }
      return total;
    }, 0);
  };
  
  const currentMonthHours = calculateHours(currentMonthEntries);
  const previousMonthHours = calculateHours(previousMonthEntries);
  const currentMonthRevenue = calculateRevenue(currentMonthEntries);
  const previousMonthRevenue = calculateRevenue(previousMonthEntries);
  
  const hoursPercentageChange = previousMonthHours === 0 
    ? 100 
    : ((currentMonthHours - previousMonthHours) / previousMonthHours) * 100;
    
  const revenuePercentageChange = previousMonthRevenue === 0 
    ? 100 
    : ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
  
  const prepareClientDistributionData = () => {
    const clientMap = new Map();
    
    currentMonthEntries.forEach(entry => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const clientName = entry.clients?.name || 'Unknown Client';
        if (!clientMap.has(clientName)) {
          clientMap.set(clientName, 0);
        }
        
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        clientMap.set(clientName, clientMap.get(clientName) + hours);
      }
    });
    
    return Array.from(clientMap.entries())
      .map(([name, hours]) => ({ 
        name, 
        hours: parseFloat(hours.toFixed(2))
      }))
      .sort((a, b) => b.hours - a.hours);
  };
  
  const prepareActivityTypeData = () => {
    const activityMap = new Map();
    
    currentMonthEntries.forEach(entry => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const activityName = entry.products.name || 'Unknown Activity';
        if (!activityMap.has(activityName)) {
          activityMap.set(activityName, 0);
        }
        
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        activityMap.set(activityName, activityMap.get(activityName) + hours);
      }
    });
    
    return Array.from(activityMap.entries())
      .map(([name, hours]) => ({ 
        name, 
        hours: parseFloat(hours.toFixed(2))
      }))
      .sort((a, b) => b.hours - a.hours);
  };
  
  const prepareRevenueByClientData = () => {
    const clientMap = new Map();
    
    currentMonthEntries.forEach(entry => {
      const clientName = entry.clients?.name || 'Unknown Client';
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, 0);
      }
      
      let revenue = 0;
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        revenue = hours * (entry.products.price || 0);
      } else if (entry.products?.type === 'item' && entry.quantity) {
        revenue = entry.quantity * (entry.products.price || 0);
      }
      
      clientMap.set(clientName, clientMap.get(clientName) + revenue);
    });
    
    return Array.from(clientMap.entries())
      .map(([name, revenue]) => ({ 
        name, 
        revenue: parseFloat(revenue.toFixed(2))
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };
  
  const clientDistribution = prepareClientDistributionData();
  const activityDistribution = prepareActivityTypeData();
  const revenueByClient = prepareRevenueByClientData();
  
  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', 
    '#FFBB28', '#FF8042', '#0088FE', '#00C49F', '#FFBB28'
  ];
  
  const calculateProductivity = () => {
    const daysInMonth = differenceInDays(currentMonthEnd, currentMonthStart) + 1;
    const workDays = daysInMonth * 0.7; // Approximate working days
    const averageHoursPerDay = currentMonthHours / workDays;
    
    // Scale to 0-100
    return Math.min(100, (averageHoursPerDay / 8) * 100);
  };
  
  const productivityScore = calculateProductivity();
  
  const getMonthName = (date) => {
    return format(date, 'MMMM', { locale: dateLocale });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('userStats.title')}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* User info card */}
        <Card className="flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">{userData?.full_name || ''}</h2>
          <p className="text-muted-foreground">{userData?.email || ''}</p>
        </Card>
        
        {/* Hours card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('userStats.totalHours')}</CardTitle>
            <CardDescription>
              {getMonthName(currentMonth)} {format(currentMonth, 'yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{currentMonthHours.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">
                  {previousMonthHours > 0 && (
                    <span className={hoursPercentageChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {hoursPercentageChange >= 0 ? '↑' : '↓'} {Math.abs(hoursPercentageChange).toFixed(0)}%
                    </span>
                  )}
                  {previousMonthHours > 0 && ` ${t('userStats.previousPeriod')}: ${previousMonthHours.toFixed(1)}`}
                </div>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Revenue card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('userStats.totalRevenue')}</CardTitle>
            <CardDescription>
              {getMonthName(currentMonth)} {format(currentMonth, 'yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{currentMonthRevenue.toFixed(0)} SEK</div>
                <div className="text-xs text-muted-foreground">
                  {previousMonthRevenue > 0 && (
                    <span className={revenuePercentageChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {revenuePercentageChange >= 0 ? '↑' : '↓'} {Math.abs(revenuePercentageChange).toFixed(0)}%
                    </span>
                  )}
                  {previousMonthRevenue > 0 && ` ${t('userStats.previousPeriod')}: ${previousMonthRevenue.toFixed(0)} SEK`}
                </div>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Productivity card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('userStats.productivityScore')}</CardTitle>
            <CardDescription>
              {getMonthName(currentMonth)} {format(currentMonth, 'yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{Math.round(productivityScore)}</div>
                <div className="text-xs text-muted-foreground">
                  {t('userStats.averageHoursPerDay')}: {(currentMonthHours / (differenceInDays(currentMonthEnd, currentMonthStart) * 0.7)).toFixed(1)}
                </div>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <BarChart2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            {t('userStats.overview')}
          </TabsTrigger>
          <TabsTrigger value="clients">
            {t('userStats.clientDistribution')}
          </TabsTrigger>
          <TabsTrigger value="activities">
            {t('userStats.activityBreakdown')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('userStats.hoursPerClient')}</CardTitle>
                <CardDescription>
                  {getMonthName(currentMonth)} {format(currentMonth, 'yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientDistribution.length > 0 ? (
                  <BarChart
                    data={clientDistribution.slice(0, 5)}
                    height={300}
                    barKey="hours"
                    barName={t('common.hours')}
                    barFill="#0ea5e9"
                  />
                ) : (
                  <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('userStats.revenuePerClient')}</CardTitle>
                <CardDescription>
                  {getMonthName(currentMonth)} {format(currentMonth, 'yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revenueByClient.length > 0 ? (
                  <BarChart
                    data={revenueByClient.slice(0, 5)}
                    height={300}
                    barKey="revenue"
                    barName="Revenue (SEK)"
                    barFill="#10b981"
                  />
                ) : (
                  <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('userStats.clientDistribution')}</CardTitle>
              <CardDescription>
                {getMonthName(currentMonth)} {format(currentMonth, 'yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {clientDistribution.length > 0 ? (
                <div className="w-full h-[400px]">
                  <CustomPieChart
                    data={clientDistribution}
                    dataKey="hours"
                    colors={COLORS}
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center h-[400px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('userStats.activityBreakdown')}</CardTitle>
              <CardDescription>
                {getMonthName(currentMonth)} {format(currentMonth, 'yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {activityDistribution.length > 0 ? (
                <div className="w-full h-[400px]">
                  <CustomPieChart
                    data={activityDistribution}
                    dataKey="hours"
                    colors={COLORS}
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center h-[400px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
