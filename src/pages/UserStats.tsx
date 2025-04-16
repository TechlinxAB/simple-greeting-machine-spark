
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
import { BarChart as CustomBarChart, PieChart } from "@/components/dashboard/CustomCharts";
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
  Loader2
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
    
    entries.forEach(entry => {
      if (!entry.products) return;
      
      const productId = entry.product_id || '';
      const productName = entry.products.name || 'Unknown Product';
      
      if (!productStats[productId]) {
        productStats[productId] = { 
          name: productName, 
          type: entry.products.type as 'activity' | 'item',
          units: 0,
          revenue: 0 
        };
      }
      
      if (entry.products.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        productStats[productId].units = (productStats[productId].units || 0) + hours;
        productStats[productId].revenue = (productStats[productId].revenue || 0) + hours * (entry.products.price || 0);
      } else if (entry.products.type === 'item' && entry.quantity) {
        productStats[productId].units = (productStats[productId].units || 0) + entry.quantity;
        productStats[productId].revenue = (productStats[productId].revenue || 0) + entry.quantity * (entry.products.price || 0);
      }
    });
    
    return Object.values(productStats)
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .map(stat => ({
        name: stat.name || '',
        type: stat.type || 'item',
        units: stat.type === 'activity' ? parseFloat((stat.units || 0).toFixed(1)) : Math.round(stat.units || 0),
        unitLabel: stat.type === 'activity' ? 'hours' : 'units',
        revenue: Math.round(stat.revenue || 0)
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

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-[calc(100vh-200px)]">
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

  return (
    <div className={`container mx-auto py-6 space-y-6 ${isLaptop ? 'px-2 max-w-full' : 'px-4'}`}>
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          size={isLaptop ? "sm" : "default"} 
          onClick={handleGoBack}
          className={`${isLaptop ? 'h-8' : ''} flex items-center gap-2`}
        >
          <ArrowLeft className={isLaptop ? "h-4 w-4" : "h-5 w-5"} />
          <span>Back to Users</span>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Card className="w-full md:w-1/3">
          <CardHeader className="pb-4">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-2">
                <AvatarImage src={profile.avatar_url || ""} alt={profile.name || "User"} />
                <AvatarFallback className="text-xl bg-primary/10">
                  {(profile.name?.charAt(0) || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="mt-2">{profile.name}</CardTitle>
              <Badge variant={roleBadgeVariants[profile.role as keyof typeof roleBadgeVariants] as any || "secondary"} className="mt-2">
                <span className="capitalize">{profile.role}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-muted-foreground text-xs mb-1">Current Month</p>
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Clock className="h-4 w-4" />
                  <p className="text-lg font-bold">{currentMonthHours} h</p>
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-muted-foreground text-xs mb-1">Current Month</p>
                <div className="flex items-center justify-center gap-1 text-primary">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-lg font-bold">{currentMonthRevenue} SEK</p>
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-muted-foreground text-xs mb-1">All Time</p>
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Clock className="h-4 w-4" />
                  <p className="text-lg font-bold">{allTimeHours} h</p>
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-muted-foreground text-xs mb-1">All Time</p>
                <div className="flex items-center justify-center gap-1 text-primary">
                  <CreditCard className="h-4 w-4" />
                  <p className="text-lg font-bold">{allTimeRevenue} SEK</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full md:w-2/3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Performance Statistics</CardTitle>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(currentDate, 'MMMM yyyy')}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              View detailed performance metrics for this user
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="current-month">Current Month</TabsTrigger>
                <TabsTrigger value="all-time">All Time</TabsTrigger>
              </TabsList>
              
              <TabsContent value="current-month">
                {isLoadingCurrentMonth ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : currentMonthTimeEntries.length === 0 ? (
                  <Alert className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No data for this month</AlertTitle>
                    <AlertDescription>
                      This user doesn't have any time entries or sales recorded for {format(currentDate, 'MMMM yyyy')}.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Client Work Distribution</h3>
                      </div>
                      <CustomBarChart
                        data={currentMonthClientStats}
                        height={250}
                        barKey="hours"
                        barName="Hours Worked"
                        nameKey="name"
                        barFill="#4ba64b"
                        tooltip={{
                          formatter: (value: any, name: any): [string, string] => {
                            const displayName = name.split(' ')[0];
                            return [`${value} hours`, displayName];
                          }
                        }}
                      />
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <PieChartIcon className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Top Products & Services</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Revenue by Product</h4>
                          <PieChart
                            data={currentMonthProductStats}
                            height={200}
                            dataKey="revenue"
                            nameKey="name"
                            colors={['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899']}
                            tooltip={{
                              formatter: (value: any, name: any): [string, string] => {
                                return [`${value} SEK`, name];
                              }
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Top Products</h4>
                          <div className="space-y-3 mt-4">
                            {currentMonthProductStats.slice(0, 5).map((product, index) => (
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
              </TabsContent>
              
              <TabsContent value="all-time">
                {isLoadingAllTime ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : allTimeEntries.length === 0 ? (
                  <Alert className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No data available</AlertTitle>
                    <AlertDescription>
                      This user doesn't have any time entries or sales recorded.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Client Work Distribution (All Time)</h3>
                      </div>
                      <CustomBarChart
                        data={allTimeClientStats}
                        height={250}
                        barKey="hours"
                        barName="Hours Worked"
                        nameKey="name"
                        barFill="#4ba64b"
                        tooltip={{
                          formatter: (value: any, name: any): [string, string] => {
                            const displayName = name.split(' ')[0];
                            return [`${value} hours`, displayName];
                          }
                        }}
                      />
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <PieChartIcon className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Top Products & Services (All Time)</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Revenue by Product</h4>
                          <PieChart
                            data={allTimeProductStats}
                            height={200}
                            dataKey="revenue"
                            nameKey="name"
                            colors={['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899']}
                            tooltip={{
                              formatter: (value: any, name: any): [string, string] => {
                                return [`${value} SEK`, name];
                              }
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Top Products</h4>
                          <div className="space-y-3 mt-4">
                            {allTimeProductStats.slice(0, 5).map((product, index) => (
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
