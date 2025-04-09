
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { 
  Calendar, Clock, DollarSign, Users, BarChart2, Activity, 
  FileText, Megaphone, Plus, ScrollText
} from "lucide-react";
import { NewsEditor } from "@/components/news/NewsEditor";
import { NewsPost } from "@/components/news/NewsPost";
import { NewsPost as NewsPostType } from "@/types/database";

export default function Dashboard() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [creatingPost, setCreatingPost] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPostType | null>(null);
  const queryClient = useQueryClient();
  
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const startOfCurrentMonth = startOfMonth(today);
  const endOfCurrentMonth = endOfMonth(today);
  
  const canManagePosts = role === 'admin' || role === 'manager';

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
  
  // Fetch news posts
  const { data: newsPosts = [], refetch: refetchNews } = useQuery({
    queryKey: ["news-posts"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("news_posts")
          .select("*")
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        return data as NewsPostType[];
      } catch (error) {
        console.error("Error fetching news posts:", error);
        return [];
      }
    },
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
        return total + (hours * (entry.products.price || 0));
      } else if (entry.products?.type === 'item' && entry.quantity) {
        return total + (entry.quantity * (entry.products.price || 0));
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
        return total + (hours * (entry.products.price || 0));
      } else if (entry.products?.type === 'item' && entry.quantity) {
        return total + (entry.quantity * (entry.products.price || 0));
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
        const date = new Date(entry.created_at || new Date());
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
    
    return Array.from(activityMap.entries()).map(([name, hours]) => ({ 
      name, 
      hours: parseFloat(hours.toFixed(2))
    }));
  };
  
  // Handle news post management
  const handleNewsPostCreated = () => {
    setCreatingPost(false);
    setEditingPost(null);
    queryClient.invalidateQueries({ queryKey: ["news-posts"] });
    refetchNews();
  };
  
  const handleStartEditing = (post: NewsPostType) => {
    setEditingPost(post);
    setCreatingPost(true);
  };
  
  const handleCancelEditing = () => {
    setCreatingPost(false);
    setEditingPost(null);
  };
  
  const handlePostDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["news-posts"] });
    refetchNews();
  };
  
  // Colors for charts
  const COLORS = ['#7FB069', '#5A9A5A', '#96C7A9', '#4E9258', '#8FCA8F', '#3C5948'];
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard & Analytics</h1>
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
                    <Bar dataKey="hours" fill="#7FB069" name="Hours Logged" />
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
                              return total + (hours * (entry.products.price || 0));
                            } else if (entry.products?.type === 'item' && entry.quantity) {
                              return total + (entry.quantity * (entry.products.price || 0));
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
          {creatingPost ? (
            <NewsEditor 
              onSuccess={handleNewsPostCreated} 
              editingPost={editingPost} 
              onCancel={handleCancelEditing}
            />
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  <span>Company News & Announcements</span>
                </h2>
                
                {canManagePosts && (
                  <Button 
                    onClick={() => setCreatingPost(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add News Post</span>
                  </Button>
                )}
              </div>
              
              <div className="space-y-6">
                {newsPosts.length > 0 ? (
                  newsPosts.map((post) => (
                    <NewsPost 
                      key={post.id} 
                      post={post} 
                      onEdit={handleStartEditing}
                      onDelete={handlePostDeleted}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        No news posts available.
                        {canManagePosts && " Click the 'Add News Post' button to create one."}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
