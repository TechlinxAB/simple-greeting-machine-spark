
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { 
  Calendar, Clock, DollarSign, Users, BarChart2, Activity, 
  FileText, Edit, Save, X, Megaphone
} from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingNews, setEditingNews] = useState(false);
  const [newsContent, setNewsContent] = useState("");
  
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const startOfCurrentMonth = startOfMonth(today);
  const endOfCurrentMonth = endOfMonth(today);
  
  const canEditNews = role === 'admin' || role === 'manager';

  // Fetch user's time entries for today
  const { data: todayEntries = [] } = useQuery({
    queryKey: ["time-entries", "today", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from("time_entries")
          .select(`
            id, start_time, end_time, quantity,
            products:product_id (id, name, type, price)
          `)
          .eq("user_id", user.id)
          .gte("created_at", startOfToday.toISOString())
          .lte("created_at", endOfToday.toISOString());
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching today's entries:", error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  // Fetch user's time entries for the current month
  const { data: monthEntries = [] } = useQuery({
    queryKey: ["time-entries", "month", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from("time_entries")
          .select(`
            id, start_time, end_time, quantity, created_at,
            products:product_id (id, name, type, price)
          `)
          .eq("user_id", user.id)
          .gte("created_at", startOfCurrentMonth.toISOString())
          .lte("created_at", endOfCurrentMonth.toISOString());
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching month entries:", error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  // Fetch all time entries for the company (for admins/managers)
  const { data: companyEntries = [] } = useQuery({
    queryKey: ["time-entries", "company", "month"],
    queryFn: async () => {
      if (!user || (role !== 'admin' && role !== 'manager')) return [];
      
      try {
        const { data, error } = await supabase
          .from("time_entries")
          .select(`
            id, start_time, end_time, quantity, created_at, user_id,
            products:product_id (id, name, type, price)
          `)
          .gte("created_at", startOfCurrentMonth.toISOString())
          .lte("created_at", endOfCurrentMonth.toISOString());
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching company entries:", error);
        return [];
      }
    },
    enabled: !!user && (role === 'admin' || role === 'manager'),
  });
  
  // Fetch company news
  const { data: newsData, refetch: refetchNews } = useQuery({
    queryKey: ["company-news"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "company_news")
          .single();
          
        if (error && error.code !== 'PGRST116') throw error;
        return data?.value || "Welcome to our company news section! No announcements yet.";
      } catch (error) {
        console.error("Error fetching company news:", error);
        return "Error loading company news.";
      }
    },
  });
  
  // Set news content when data is loaded
  useState(() => {
    if (newsData) {
      setNewsContent(newsData);
    }
  });
  
  // Calculate statistics
  const calculateTodayHours = () => {
    return todayEntries.reduce((total, entry) => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0).toFixed(2);
  };
  
  const calculateMonthHours = () => {
    return monthEntries.reduce((total, entry) => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0).toFixed(2);
  };
  
  const calculateTodayRevenue = () => {
    return todayEntries.reduce((total, entry) => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + (hours * entry.products.price);
      } else if (entry.products?.type === 'item' && entry.quantity) {
        return total + (entry.quantity * entry.products.price);
      }
      return total;
    }, 0).toFixed(2);
  };
  
  const calculateMonthRevenue = () => {
    return monthEntries.reduce((total, entry) => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + (hours * entry.products.price);
      } else if (entry.products?.type === 'item' && entry.quantity) {
        return total + (entry.quantity * entry.products.price);
      }
      return total;
    }, 0).toFixed(2);
  };
  
  // Prepare chart data
  const prepareWeeklyActivityData = () => {
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const weekData = weekDays.map(day => ({ name: day, hours: 0 }));
    
    monthEntries.forEach(entry => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const date = new Date(entry.created_at);
        const dayIndex = (date.getDay() + 6) % 7; // Make Monday index 0
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        weekData[dayIndex].hours += hours;
      }
    });
    
    return weekData;
  };
  
  const prepareActivityTypeData = () => {
    const activityMap = new Map();
    
    monthEntries.forEach(entry => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const activityName = entry.products.name;
        if (!activityMap.has(activityName)) {
          activityMap.set(activityName, 0);
        }
        
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        activityMap.set(activityName, activityMap.get(activityName) + hours);
      }
    });
    
    return Array.from(activityMap.entries()).map(([name, hours]) => ({ 
      name, 
      hours: parseFloat(hours.toFixed(2))
    }));
  };
  
  // Handle news updates
  const handleSaveNews = async () => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ 
          key: "company_news", 
          value: newsContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      toast.success("Company news updated successfully");
      setEditingNews(false);
      refetchNews();
    } catch (error) {
      console.error("Error updating news:", error);
      toast.error("Failed to update company news");
    }
  };
  
  const handleCancelEdit = () => {
    setNewsContent(newsData || "");
    setEditingNews(false);
  };
  
  // Colors for charts
  const COLORS = ['#8BC34A', '#4CAF50', '#009688', '#2196F3', '#3F51B5', '#673AB7', '#9C27B0'];
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span>Company News</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Your Daily Stats</CardTitle>
                <CardDescription>Today, {format(today, "MMMM d, yyyy")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                    <div className="rounded-full bg-primary/20 p-2 mr-3">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Hours Logged</p>
                      <p className="text-2xl font-bold">{calculateTodayHours()}</p>
                    </div>
                  </div>
                  
                  <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                    <div className="rounded-full bg-primary/20 p-2 mr-3">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-2xl font-bold">{calculateTodayRevenue()} SEK</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Your Monthly Stats</CardTitle>
                <CardDescription>{format(today, "MMMM yyyy")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                    <div className="rounded-full bg-primary/20 p-2 mr-3">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Hours</p>
                      <p className="text-2xl font-bold">{calculateMonthHours()}</p>
                    </div>
                  </div>
                  
                  <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                    <div className="rounded-full bg-primary/20 p-2 mr-3">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-2xl font-bold">{calculateMonthRevenue()} SEK</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Weekly Activity Distribution</CardTitle>
                <CardDescription>Hours worked per day this month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareWeeklyActivityData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} hours`, 'Time Spent']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    <Bar dataKey="hours" fill="#4CAF50" name="Hours Logged" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Activity Types</CardTitle>
                <CardDescription>Distribution of your activities</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareActivityTypeData()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="hours"
                      >
                        {prepareActivityTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} hours`, 'Time Spent']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {(role === 'admin' || role === 'manager') && (
              <Card>
                <CardHeader>
                  <CardTitle>Company Overview</CardTitle>
                  <CardDescription>Stats for all team members this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                      <div className="rounded-full bg-primary/20 p-2 mr-3">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Team Hours</p>
                        <p className="text-2xl font-bold">
                          {companyEntries.reduce((total, entry) => {
                            if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
                              const start = new Date(entry.start_time);
                              const end = new Date(entry.end_time);
                              const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                              return total + hours;
                            }
                            return total;
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                      <div className="rounded-full bg-primary/20 p-2 mr-3">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Entries</p>
                        <p className="text-2xl font-bold">{companyEntries.length}</p>
                      </div>
                    </div>
                    
                    <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                      <div className="rounded-full bg-primary/20 p-2 mr-3">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">
                          {companyEntries.reduce((total, entry) => {
                            if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
                              const start = new Date(entry.start_time);
                              const end = new Date(entry.end_time);
                              const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                              return total + (hours * entry.products.price);
                            } else if (entry.products?.type === 'item' && entry.quantity) {
                              return total + (entry.quantity * entry.products.price);
                            }
                            return total;
                          }, 0).toFixed(2)} SEK
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="news">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Company News & Announcements</CardTitle>
                <CardDescription>Latest updates from management</CardDescription>
              </div>
              
              {canEditNews && !editingNews && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingNews(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit News</span>
                </Button>
              )}
              
              {canEditNews && editingNews && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleSaveNews}
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </Button>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {editingNews ? (
                <Textarea 
                  value={newsContent} 
                  onChange={(e) => setNewsContent(e.target.value)}
                  className="min-h-[300px]"
                  placeholder="Enter company news and announcements here..."
                />
              ) : (
                <div className="prose max-w-none">
                  {newsData ? (
                    <div className="bg-secondary/30 p-6 rounded-lg whitespace-pre-wrap">
                      {newsData}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <div className="text-center">
                        <Megaphone className="mx-auto h-12 w-12 mb-4 text-muted-foreground/60" />
                        <p>Loading company news...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
