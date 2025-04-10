
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { 
  CalendarIcon, 
  Users, 
  Clock, 
  FileText,
  FilterIcon,
  TrashIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { TimeEntriesTable } from "@/components/administration/TimeEntriesTable";
import { InvoicesTable } from "@/components/administration/InvoicesTable";
import { Badge } from "@/components/ui/badge";
import { type Client, type TimeEntry, type Invoice } from "@/types";

export default function Administration() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("time-entries");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Check if user has permission to access this page
  if (role !== 'admin' && role !== 'manager') {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access the administration page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      
      if (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients");
        return [];
      }
      
      return data as Client[];
    },
  });

  // Calculate date range for the selected month
  const startDate = startOfMonth(selectedMonth);
  const endDate = endOfMonth(selectedMonth);

  // Fetch time entries based on filters
  const { 
    data: timeEntries = [], 
    isLoading: isLoadingTimeEntries,
    refetch: refetchTimeEntries 
  } = useQuery({
    queryKey: ["admin-time-entries", format(startDate, "yyyy-MM"), selectedClient],
    enabled: activeTab === "time-entries",
    queryFn: async () => {
      let query = supabase
        .from("time_entries")
        .select(`
          *,
          clients(name),
          products(name, type, price)
        `)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString());
      
      if (selectedClient) {
        query = query.eq("client_id", selectedClient);
      }
      
      const { data, error } = await query.order("start_time", { ascending: false });
      
      if (error) {
        console.error("Error fetching time entries:", error);
        toast.error("Failed to load time entries");
        return [];
      }
      
      return data as TimeEntry[];
    },
  });

  // Fetch invoices based on filters
  const { 
    data: invoices = [], 
    isLoading: isLoadingInvoices,
    refetch: refetchInvoices 
  } = useQuery({
    queryKey: ["admin-invoices", format(startDate, "yyyy-MM"), selectedClient],
    enabled: activeTab === "invoices",
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          clients(name)
        `)
        .gte("issue_date", startDate.toISOString().split('T')[0])
        .lte("issue_date", endDate.toISOString().split('T')[0]);
      
      if (selectedClient) {
        query = query.eq("client_id", selectedClient);
      }
      
      const { data, error } = await query.order("issue_date", { ascending: false });
      
      if (error) {
        console.error("Error fetching invoices:", error);
        toast.error("Failed to load invoices");
        return [];
      }
      
      return data as Invoice[];
    },
  });

  const handleEntryDeleted = () => {
    refetchTimeEntries();
    toast.success("Time entry deleted successfully");
  };

  const handleInvoiceDeleted = () => {
    refetchInvoices();
    toast.success("Invoice deleted successfully");
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, -1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Manage time entries and invoices to maintain data integrity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="time-entries" className="w-full" onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <TabsList>
                  <TabsTrigger value="time-entries" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Time Entries</span>
                    {timeEntries.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{timeEntries.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Invoices</span>
                    {invoices.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{invoices.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal w-[180px]"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedMonth, "MMMM yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="month"
                        defaultMonth={selectedMonth}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedMonth(date);
                            setIsCalendarOpen(false);
                          }
                        }}
                        initialFocus
                      />
                      <div className="flex justify-between p-2 border-t">
                        <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
                          Previous
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCurrentMonth}>
                          Current
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                          Next
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Select
                    value={selectedClient || ""}
                    onValueChange={(value) => setSelectedClient(value || null)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select a client">
                        <span className="flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          {selectedClient 
                            ? clients.find(c => c.id === selectedClient)?.name || "Select a client" 
                            : "All Clients"}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedClient && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedClient(null)}
                      title="Clear client filter"
                    >
                      <FilterIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <TabsContent value="time-entries" className="mt-4">
                <TimeEntriesTable 
                  timeEntries={timeEntries} 
                  isLoading={isLoadingTimeEntries}
                  onEntryDeleted={handleEntryDeleted}
                />
              </TabsContent>
              
              <TabsContent value="invoices" className="mt-4">
                <InvoicesTable 
                  invoices={invoices} 
                  isLoading={isLoadingInvoices}
                  onInvoiceDeleted={handleInvoiceDeleted}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
