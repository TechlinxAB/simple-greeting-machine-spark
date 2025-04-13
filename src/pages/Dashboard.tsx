
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, DollarSign, Users, BarChart2, Activity, 
  FileText, Megaphone, Plus, ScrollText, Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, getYear } from "date-fns";
import { toast } from "sonner";
import { NewsEditor } from "@/components/news/NewsEditor";
import { NewsPost as NewsPostComponent } from "@/components/news/NewsPost";
import { NewsPost } from "@/types/database";
import { BarChart, PieChart } from "@/components/dashboard/CustomCharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TimeJournalStats } from "@/components/dashboard/TimeJournalStats";
import { UserSelect } from "@/components/dashboard/UserSelect";

export default function Dashboard() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState("my-journal");
  const [creatingPost, setCreatingPost] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const canManagePosts = role === 'admin' || role === 'manager';
  const canViewTeamJournal = role === 'admin' || role === 'manager';
  
  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .order("name");
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching clients:", error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const months = [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" }
  ];
  
  const { data: newsPosts = [], refetch: refetchNews } = useQuery({
    queryKey: ["news-posts"],
    queryFn: async () => {
      try {
        // First fetch the news posts
        const { data: postsData, error: postsError } = await supabase
          .from("news_posts")
          .select(`
            id, 
            title, 
            content, 
            image_url, 
            created_at, 
            updated_at, 
            created_by
          `)
          .order("created_at", { ascending: false });
          
        if (postsError) throw postsError;
        
        // Then fetch user data separately for each post
        const postsWithAuthor = await Promise.all(
          postsData.map(async (post) => {
            let authorName = 'Unknown';
            
            if (post.created_by) {
              const { data: userData, error: userError } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", post.created_by)
                .single();
                
              if (!userError && userData) {
                authorName = userData.name || 'Unknown';
              }
            }
            
            return {
              ...post,
              author_name: authorName
            };
          })
        );
        
        return postsWithAuthor as NewsPost[];
      } catch (error) {
        console.error("Error fetching news posts:", error);
        return [];
      }
    },
  });
  
  const handleNewsPostCreated = () => {
    setCreatingPost(false);
    setEditingPost(null);
    queryClient.invalidateQueries({ queryKey: ["news-posts"] });
    refetchNews();
  };
  
  const handleStartEditing = (post: NewsPost) => {
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
  
  const toggleFilter = (filter: string) => {
    setFilters(current => {
      const newFilters = current.includes(filter)
        ? current.filter(f => f !== filter)
        : [...current, filter];
      
      if (current.includes(filter) && !newFilters.includes(filter)) {
        if (filter === 'client') setSelectedClient(null);
        if (filter === 'year') setSelectedYear(new Date().getFullYear());
        if (filter === 'month') setSelectedMonth(new Date().getMonth());
      }
      
      return newFilters;
    });
  };
  
  useEffect(() => {
    setFilters([]);
    setSelectedClient(null);
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(new Date().getMonth());
    setSelectedUser(null);
  }, [activeTab]);
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="my-journal" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>My Time Journal</span>
          </TabsTrigger>
          
          {canViewTeamJournal && (
            <TabsTrigger value="team-journal" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Team Time Journal</span>
            </TabsTrigger>
          )}
          
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span>Company News</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-journal" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Time Records</h2>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filter by</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={filters.includes('client')}
                  onCheckedChange={() => toggleFilter('client')}
                >
                  Client
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.includes('year')}
                  onCheckedChange={() => toggleFilter('year')}
                >
                  Year
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.includes('month')}
                  onCheckedChange={() => toggleFilter('month')}
                >
                  Month
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2 p-4 bg-secondary/20 rounded-lg">
              {filters.includes('client') && (
                <div className="flex-1 min-w-[200px]">
                  <Select
                    value={selectedClient || "all-clients"}
                    onValueChange={(val) => setSelectedClient(val === "all-clients" ? null : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-clients">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {filters.includes('year') && (
                <div className="flex-1 min-w-[150px]">
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {filters.includes('month') && (
                <div className="flex-1 min-w-[150px]">
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
          <TimeJournalStats 
            userId={user?.id}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedClient={selectedClient}
          />
        </TabsContent>
        
        {canViewTeamJournal && (
          <TabsContent value="team-journal" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Team Time Records</h2>
              
              <div className="flex gap-2">
                <UserSelect
                  value={selectedUser}
                  onChange={setSelectedUser}
                />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Filter by</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuCheckboxItem
                      checked={filters.includes('client')}
                      onCheckedChange={() => toggleFilter('client')}
                    >
                      Client
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.includes('year')}
                      onCheckedChange={() => toggleFilter('year')}
                    >
                      Year
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.includes('month')}
                      onCheckedChange={() => toggleFilter('month')}
                    >
                      Month
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {filters.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 bg-secondary/20 rounded-lg">
                {filters.includes('client') && (
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      value={selectedClient || "all-clients"}
                      onValueChange={(val) => setSelectedClient(val === "all-clients" ? null : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-clients">All Clients</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {filters.includes('year') && (
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {filters.includes('month') && (
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(value) => setSelectedMonth(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map(month => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            
            <TimeJournalStats 
              userId={selectedUser || undefined}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedClient={selectedClient}
              showUserColumn={true}
            />
          </TabsContent>
        )}
        
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
                    <NewsPostComponent 
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
