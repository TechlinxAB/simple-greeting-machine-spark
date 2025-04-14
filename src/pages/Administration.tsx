import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, parseISO, setMonth, setYear } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TimeEntriesTable } from "@/components/administration/TimeEntriesTable";
import { InvoicesTable } from "@/components/administration/InvoicesTable";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MonthYearSelector } from "@/components/administration/MonthYearSelector";
import { type Client, type TimeEntry, type Invoice } from "@/types";
import { Icons } from "@/components/icons";

export default function Administration() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("time-entries");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [noDateFilter, setNoDateFilter] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 100;
  
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

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  
  const handleMonthYearChange = (month: number, year: number) => {
    const newDate = new Date(year, month, 1);
    setSelectedDate(newDate);
    setNoDateFilter(false);
    
    // Log the date change to help with debugging
    console.log(`Date changed to: ${format(newDate, 'yyyy-MM-dd')}, month: ${month}, year: ${year}`);
  };

  const getDateRange = () => {
    if (noDateFilter) {
      return { startDate: null, endDate: null };
    }
    
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    
    console.log(`Date range: ${format(start, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')}`);
    
    return {
      startDate: start,
      endDate: end
    };
  };

  const { startDate, endDate } = getDateRange();

  const timeEntriesQueryKey = ["admin-time-entries", noDateFilter ? "all" : format(selectedDate, "yyyy-MM"), selectedClient, sortField, sortDirection, page];
  
  const { 
    data: timeEntries = [], 
    isLoading: isLoadingTimeEntries,
    refetch: refetchTimeEntries 
  } = useQuery({
    queryKey: timeEntriesQueryKey,
    enabled: activeTab === "time-entries",
    queryFn: async () => {
      try {
        console.log("Fetching time entries with params:", {
          noDateFilter,
          dateRange: !noDateFilter ? `${startDate?.toISOString()} to ${endDate?.toISOString()}` : 'No date filter',
          client: selectedClient || 'All clients'
        });
        
        let query = supabase
          .from("time_entries")
          .select(`
            *,
            clients(name),
            products(name, type, price)
          `);
        
        if (!noDateFilter && startDate && endDate) {
          query = query
            .gte("start_time", startDate.toISOString())
            .lte("start_time", endDate.toISOString());
        }
        
        if (selectedClient) {
          query = query.eq("client_id", selectedClient);
        }
        
        if (sortField) {
          query = query.order(sortField, { ascending: sortDirection === 'asc' });
        } else {
          query = query.order("start_time", { ascending: false });
        }
        
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);
        
        const { data: entriesData, error: entriesError } = await query;
        
        if (entriesError) {
          console.error("Error fetching time entries:", entriesError);
          toast.error("Failed to load time entries");
          return [];
        }
        
        console.log(`Found ${entriesData?.length || 0} time entries`);
        
        // Process the data to add the username from user_id
        const processedEntries = entriesData?.map(entry => ({
          ...entry,
          // Add a profiles object with name that we couldn't get from the join
          profiles: {
            name: "User " + entry.user_id.substring(0, 8) // Simple fallback name based on user_id
          }
        }));
        
        return processedEntries as TimeEntry[];
      } catch (error) {
        console.error("Error in time entries query:", error);
        toast.error("Failed to load time entries");
        return [];
      }
    },
  });

  const invoicesQueryKey = ["admin-invoices", noDateFilter ? "all" : format(selectedDate, "yyyy-MM"), selectedClient, sortField, sortDirection, page];

  const { 
    data: invoices = [], 
    isLoading: isLoadingInvoices,
    refetch: refetchInvoices 
  } = useQuery({
    queryKey: invoicesQueryKey,
    enabled: activeTab === "invoices",
    queryFn: async () => {
      try {
        let query = supabase
          .from("invoices")
          .select(`
            *,
            clients(name)
          `);
        
        if (!noDateFilter && startDate && endDate) {
          query = query
            .gte("issue_date", startDate.toISOString().split('T')[0])
            .lte("issue_date", endDate.toISOString().split('T')[0]);
        }
        
        if (selectedClient) {
          query = query.eq("client_id", selectedClient);
        }
        
        if (sortField) {
          query = query.order(sortField, { ascending: sortDirection === 'asc' });
        } else {
          query = query.order("issue_date", { ascending: false });
        }
        
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching invoices:", error);
          toast.error("Failed to load invoices");
          return [];
        }
        
        return data as Invoice[];
      } catch (error) {
        console.error("Error in invoices query:", error);
        toast.error("Failed to load invoices");
        return [];
      }
    },
  });

  const {
    data: timeEntriesCount = 0
  } = useQuery({
    queryKey: ["admin-time-entries-count", noDateFilter ? "all" : format(startDate!, "yyyy-MM"), selectedClient],
    enabled: activeTab === "time-entries",
    queryFn: async () => {
      try {
        let query = supabase
          .from("time_entries")
          .select("id", { count: 'exact', head: true });
        
        if (!noDateFilter) {
          query = query
            .gte("start_time", startDate!.toISOString())
            .lte("start_time", endDate!.toISOString());
        }
        
        if (selectedClient) {
          query = query.eq("client_id", selectedClient);
        }
        
        const { count, error } = await query;
        
        if (error) {
          console.error("Error counting time entries:", error);
          return 0;
        }
        
        return count || 0;
      } catch (error) {
        console.error("Error in time entries count query:", error);
        return 0;
      }
    }
  });

  const {
    data: invoicesCount = 0
  } = useQuery({
    queryKey: ["admin-invoices-count", noDateFilter ? "all" : format(startDate!, "yyyy-MM"), selectedClient],
    enabled: activeTab === "invoices",
    queryFn: async () => {
      try {
        let query = supabase
          .from("invoices")
          .select("id", { count: 'exact', head: true });
        
        if (!noDateFilter) {
          query = query
            .gte("issue_date", startDate!.toISOString().split('T')[0])
            .lte("issue_date", endDate!.toISOString().split('T')[0]);
        }
        
        if (selectedClient) {
          query = query.eq("client_id", selectedClient);
        }
        
        const { count, error } = await query;
        
        if (error) {
          console.error("Error counting invoices:", error);
          return 0;
        }
        
        return count || 0;
      } catch (error) {
        console.error("Error in invoices count query:", error);
        return 0;
      }
    }
  });

  const handleEntryDeleted = () => {
    refetchTimeEntries();
    toast.success("Time entry deleted successfully");
  };

  const handleInvoiceDeleted = () => {
    refetchInvoices();
    toast.success("Invoice deleted successfully");
  };
  
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setIsDeleting(true);
    
    try {
      if (activeTab === "time-entries") {
        await supabase
          .from("time_entries")
          .update({ 
            invoice_id: null,
            invoiced: false 
          })
          .in("id", selectedItems)
          .filter("invoiced", "eq", true);
          
        const { error } = await supabase
          .from("time_entries")
          .delete()
          .in("id", selectedItems);
          
        if (error) {
          console.error("Error deleting time entries:", error);
          toast.error("Failed to delete time entries");
          setIsDeleting(false);
          return;
        }
        
        refetchTimeEntries();
        toast.success(`${selectedItems.length} time entries deleted successfully`);
      } else {
        const timeEntries = await supabase
          .from("time_entries")
          .select("id")
          .in("invoice_id", selectedItems);
          
        if (timeEntries.data && timeEntries.data.length > 0) {
          await supabase
            .from("time_entries")
            .update({ 
              invoice_id: null,
              invoiced: false 
            })
            .in("invoice_id", selectedItems);
        }
        
        const { error } = await supabase
          .from("invoices")
          .delete()
          .in("id", selectedItems);
          
        if (error) {
          console.error("Error deleting invoices:", error);
          toast.error("Failed to delete invoices");
          setIsDeleting(false);
          return;
        }
        
        refetchInvoices();
        toast.success(`${selectedItems.length} invoices deleted successfully`);
      }
      
      setSelectedItems([]);
      setBulkDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Error in bulk delete operation:", error);
      toast.error("An unexpected error occurred");
      setIsDeleting(false);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const items = activeTab === "time-entries" 
        ? timeEntries.map(entry => entry.id)
        : invoices.map(invoice => invoice.id);
      setSelectedItems(items);
    } else {
      setSelectedItems([]);
    }
  };
  
  useEffect(() => {
    setPage(1);
  }, [selectedClient, noDateFilter, activeTab]);
  
  useEffect(() => {
    setSelectedItems([]);
  }, [activeTab]);
  
  const totalPages = Math.ceil(
    activeTab === "time-entries" 
      ? timeEntriesCount / ITEMS_PER_PAGE 
      : invoicesCount / ITEMS_PER_PAGE
  );
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
                    <Icons.clock className="h-4 w-4" />
                    <span>Time Entries</span>
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="flex items-center gap-2">
                    <Icons.fileText className="h-4 w-4" />
                    <span>Invoices</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select
                    value={selectedClient || "all"}
                    onValueChange={(value) => setSelectedClient(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select a client">
                        <span className="flex items-center">
                          <Icons.users className="mr-2 h-4 w-4" />
                          {selectedClient 
                            ? clients.find(c => c.id === selectedClient)?.name || "Select a client" 
                            : "All Clients"}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
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
                      <Icons.filterIcon className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <MonthYearSelector
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onMonthYearChange={handleMonthYearChange}
                    includeAllOption={true}
                    onAllSelected={() => setNoDateFilter(prev => !prev)}
                    isAllSelected={noDateFilter}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedItems.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteConfirmOpen(true)}
                      className="flex items-center gap-1"
                    >
                      <Icons.trash className="h-4 w-4" />
                      <span>Delete Selected ({selectedItems.length})</span>
                    </Button>
                  )}
                  
                  {bulkDeleteOpen ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkDeleteOpen(false);
                        setSelectedItems([]);
                      }}
                    >
                      Cancel Selection
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkDeleteOpen(true)}
                      className="flex items-center gap-1"
                    >
                      <Icons.check className="h-4 w-4" />
                      <span>Select Multiple</span>
                    </Button>
                  )}
                </div>
              </div>
              
              <TabsContent value="time-entries" className="mt-4">
                <TimeEntriesTable 
                  timeEntries={timeEntries} 
                  isLoading={isLoadingTimeEntries}
                  onEntryDeleted={handleEntryDeleted}
                  bulkDeleteMode={bulkDeleteOpen}
                  selectedItems={selectedItems}
                  onItemSelect={toggleItemSelection}
                  onSelectAll={handleSelectAll}
                  onSort={handleSort}
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
                
                {!isLoadingTimeEntries && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    {totalPages > 0 ? (
                      <p>Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, timeEntriesCount)} of {timeEntriesCount} entries. Max per page is {ITEMS_PER_PAGE}.</p>
                    ) : (
                      <p>No time entries found matching the current filters.</p>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="invoices" className="mt-4">
                <InvoicesTable 
                  invoices={invoices} 
                  isLoading={isLoadingInvoices}
                  onInvoiceDeleted={handleInvoiceDeleted}
                  bulkDeleteMode={bulkDeleteOpen}
                  selectedItems={selectedItems}
                  onItemSelect={toggleItemSelection}
                  onSelectAll={handleSelectAll}
                  onSort={handleSort}
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
                
                {!isLoadingInvoices && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    {totalPages > 0 ? (
                      <p>Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, invoicesCount)} of {invoicesCount} invoices. Max per page is {ITEMS_PER_PAGE}.</p>
                    ) : (
                      <p>No invoices found matching the current filters.</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Delete Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                Are you sure you want to delete {selectedItems.length} selected {
                  activeTab === "time-entries" ? "time entries" : "invoices"
                }? This action cannot be undone.
                
                {activeTab === "invoices" && (
                  <div className="mt-2 text-amber-500 flex items-start gap-2">
                    <Icons.alertCircle className="h-5 w-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Warning: Some invoices may have been exported to Fortnox</p>
                      <p>Deleting these invoices will only remove them from your database, not from Fortnox.</p>
                    </div>
                  </div>
                )}
                
                {activeTab === "time-entries" && (
                  <div className="mt-2 text-amber-500 flex items-start gap-2">
                    <Icons.alertCircle className="h-5 w-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Warning: Some time entries may be invoiced</p>
                      <p>Deleting invoiced time entries will remove their invoice reference, which may cause inconsistencies with Fortnox.</p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
