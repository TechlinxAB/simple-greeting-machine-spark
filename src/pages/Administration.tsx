import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeEntriesTable } from "@/components/administration/TimeEntriesTable";
import { InvoicesTable } from "@/components/administration/InvoicesTable";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, AlertCircle, FileSearch } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import { MonthYearSelector } from "@/components/administration/MonthYearSelector";
import { UserSelect } from "@/components/administration/UserSelect";
import { ClientSelect } from "@/components/administration/ClientSelect";
import { toast } from "sonner";
import { AllTimeToggle } from "@/components/administration/AllTimeToggle";
import { TimeEntry, Invoice } from "@/types";

export default function Administration() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedEntriesIds, setSelectedEntriesIds] = useState<string[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<string | null>("start_time");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [allTimeEnabled, setAllTimeEnabled] = useState(false);
  const [timeEntriesBulkMode, setTimeEntriesBulkMode] = useState(false);
  const [invoicesBulkMode, setInvoicesBulkMode] = useState(false);
  const [isInvoiceDeleteDialogOpen, setIsInvoiceDeleteDialogOpen] = useState(false);
  const [isDeletingInvoices, setIsDeletingInvoices] = useState(false);

  const handleMonthYearChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleUserChange = (userId: string | null) => {
    setSelectedUserId(userId);
  };

  const handleClientChange = (clientId: string | null) => {
    setSelectedClientId(clientId);
  };

  const startDate = allTimeEnabled ? undefined : startOfMonth(new Date(selectedYear, selectedMonth));
  const endDate = allTimeEnabled ? undefined : endOfMonth(new Date(selectedYear, selectedMonth));

  const toggleAllTime = (enabled: boolean) => {
    setAllTimeEnabled(enabled);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntriesIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEntries = (checked: boolean) => {
    if (checked) {
      setSelectedEntriesIds(timeEntries.map(entry => entry.id));
    } else {
      setSelectedEntriesIds([]);
    }
  };

  const handleSelectAllInvoices = (checked: boolean) => {
    if (checked) {
      setSelectedInvoiceIds(invoices.map(invoice => invoice.id));
    } else {
      setSelectedInvoiceIds([]);
    }
  };

  const handleDeleteSelectedEntries = () => {
    if (selectedEntriesIds.length === 0) {
      toast.error("No time entries selected");
      return;
    }
    
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSelectedInvoices = () => {
    if (selectedInvoiceIds.length === 0) {
      toast.error("No invoices selected");
      return;
    }
    
    setIsInvoiceDeleteDialogOpen(true);
  };

  const confirmDeleteSelectedEntries = async () => {
    if (selectedEntriesIds.length === 0) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .in("id", selectedEntriesIds);
      
      if (error) {
        throw error;
      }
      
      toast.success(`${selectedEntriesIds.length} time ${selectedEntriesIds.length === 1 ? 'entry' : 'entries'} deleted successfully`);
      setSelectedEntriesIds([]);
      
      // Invalidate and refetch data
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      
    } catch (error: any) {
      console.error("Error deleting time entries:", error);
      toast.error(`Failed to delete time entries: ${error.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const confirmDeleteSelectedInvoices = async () => {
    if (selectedInvoiceIds.length === 0) return;
    
    setIsDeletingInvoices(true);
    
    try {
      // First update any time entries associated with these invoices
      const { data: timeEntries, error: fetchError } = await supabase
        .from("time_entries")
        .select("id")
        .in("invoice_id", selectedInvoiceIds);
      
      if (fetchError) throw fetchError;
      
      if (timeEntries && timeEntries.length > 0) {
        const { error: updateError } = await supabase
          .from("time_entries")
          .update({ 
            invoice_id: null,
            invoiced: false 
          })
          .in("invoice_id", selectedInvoiceIds);
        
        if (updateError) throw updateError;
      }
      
      // Now delete the invoices
      const { error } = await supabase
        .from("invoices")
        .delete()
        .in("id", selectedInvoiceIds);
      
      if (error) throw error;
      
      toast.success(`${selectedInvoiceIds.length} ${selectedInvoiceIds.length === 1 ? 'invoice' : 'invoices'} deleted successfully`);
      setSelectedInvoiceIds([]);
      
      // Invalidate and refetch data
      await queryClient.invalidateQueries({ queryKey: ["invoices-admin"] });
      
    } catch (error: any) {
      console.error("Error deleting invoices:", error);
      toast.error(`Failed to delete invoices: ${error.message || "Unknown error"}`);
    } finally {
      setIsDeletingInvoices(false);
      setIsInvoiceDeleteDialogOpen(false);
    }
  };

  let query = supabase
    .from("time_entries")
    .select(`
      id, 
      user_id,
      client_id,
      product_id,
      start_time, 
      end_time, 
      quantity, 
      description, 
      created_at, 
      updated_at,
      invoiced,
      products (id, name, type, price),
      clients (name)
    `);
  
  if (selectedUserId) {
    query = query.eq("user_id", selectedUserId);
  }

  if (selectedClientId) {
    query = query.eq("client_id", selectedClientId);
  }
  
  if (!allTimeEnabled) {
    if (startDate && endDate) {
      query = query.or(`start_time.gte.${startDate.toISOString()},and(start_time.is.null,created_at.gte.${startDate.toISOString()})`);
      query = query.or(`start_time.lte.${endDate.toISOString()},and(start_time.is.null,created_at.lte.${endDate.toISOString()})`);
    }
  }
  
  if (sortField) {
    query = query.order(sortField, { ascending: sortDirection === 'asc' });
  }

  const { data: rawTimeEntries = [], isLoading } = useQuery({
    queryKey: ["time-entries", selectedMonth, selectedYear, selectedUserId, selectedClientId, sortField, sortDirection, allTimeEnabled],
    queryFn: async () => {
      console.log("Fetching time entries with params:", {
        month: selectedMonth,
        year: selectedYear,
        user: selectedUserId,
        client: selectedClientId,
        sort: sortField,
        direction: sortDirection,
        allTime: allTimeEnabled
      });
      
      try {
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching time entries:", error);
          throw error;
        }
        
        const enhancedData = await Promise.all((data || []).map(async (entry) => {
          let profileName = "Unknown";
          
          if (entry.user_id) {
            try {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", entry.user_id)
                .single();
                
              if (profileData && profileData.name) {
                profileName = profileData.name;
              }
            } catch (err) {
              console.error("Error fetching profile name:", err);
            }
          }
          
          return {
            ...entry,
            profiles: { name: profileName }
          };
        }));
        
        console.log(`Found ${enhancedData?.length || 0} time entries`);
        return enhancedData || [];
      } catch (error) {
        console.error("Error fetching time entries:", error);
        return [];
      }
    },
  });
  
  const timeEntries: TimeEntry[] = rawTimeEntries.map((entry: any) => ({
    ...entry,
    products: entry.products ? {
      ...entry.products,
      type: entry.products.type as 'activity' | 'item'
    } : undefined
  }));

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          client_id,
          invoice_number,
          status,
          issue_date,
          due_date,
          total_amount,
          exported_to_fortnox,
          fortnox_invoice_id,
          clients:client_id (id, name)
        `)
        .order("issue_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleEntryDeleted = async () => {
    await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
  };

  const handleInvoiceDeleted = async () => {
    await queryClient.invalidateQueries({ queryKey: ["invoices-admin"] });
  };

  const toggleTimeEntriesBulkMode = () => {
    setTimeEntriesBulkMode(prev => !prev);
    if (timeEntriesBulkMode) {
      setSelectedEntriesIds([]);
    }
  };

  const toggleInvoicesBulkMode = () => {
    setInvoicesBulkMode(prev => !prev);
    if (invoicesBulkMode) {
      setSelectedInvoiceIds([]);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>
      
      <Tabs defaultValue="time-entries" className="space-y-6">
        <TabsList>
          <TabsTrigger value="time-entries">Time Entries</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>
        
        <TabsContent value="time-entries" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Time Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="grid gap-2 flex-1">
                  <UserSelect 
                    value={selectedUserId} 
                    onChange={handleUserChange} 
                  />
                </div>

                <div className="grid gap-2 flex-1">
                  <ClientSelect 
                    value={selectedClientId} 
                    onChange={handleClientChange} 
                  />
                </div>
                
                <div className="grid gap-2 flex-1">
                  <label className="text-sm font-medium">Date filter</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <AllTimeToggle 
                      allTimeEnabled={allTimeEnabled} 
                      onToggleAllTime={toggleAllTime}
                    />
                    
                    {!allTimeEnabled && (
                      <MonthYearSelector
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        onMonthYearChange={handleMonthYearChange}
                      />
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 self-end">
                  <Button
                    variant={timeEntriesBulkMode ? "default" : "outline"}
                    size="sm"
                    onClick={toggleTimeEntriesBulkMode}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {timeEntriesBulkMode ? "Cancel Bulk Delete" : "Bulk Delete"}
                  </Button>

                  {timeEntriesBulkMode && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelectedEntries}
                      disabled={selectedEntriesIds.length === 0}
                    >
                      Delete Selected ({selectedEntriesIds.length})
                    </Button>
                  )}
                </div>
              </div>
              
              <TimeEntriesTable 
                timeEntries={timeEntries}
                isLoading={isLoading}
                onEntryDeleted={handleEntryDeleted}
                bulkDeleteMode={timeEntriesBulkMode}
                selectedItems={selectedEntriesIds}
                onItemSelect={handleSelectEntry}
                onSelectAll={handleSelectAllEntries}
                onBulkDelete={handleDeleteSelectedEntries}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle>Invoices</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={invoicesBulkMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleInvoicesBulkMode}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {invoicesBulkMode ? "Cancel Bulk Delete" : "Bulk Delete"}
                </Button>

                {invoicesBulkMode && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedInvoices}
                    disabled={selectedInvoiceIds.length === 0}
                  >
                    Delete Selected ({selectedInvoiceIds.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <InvoicesTable 
                invoices={invoices} 
                isLoading={isLoadingInvoices}
                onInvoiceDeleted={handleInvoiceDeleted}
                bulkDeleteMode={invoicesBulkMode}
                selectedItems={selectedInvoiceIds}
                onItemSelect={handleSelectInvoice}
                onSelectAll={handleSelectAllInvoices}
                onBulkDelete={handleDeleteSelectedInvoices}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-destructive mr-2" />
              Delete {selectedEntriesIds.length} Time {selectedEntriesIds.length === 1 ? 'Entry' : 'Entries'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEntriesIds.length} time {selectedEntriesIds.length === 1 ? 'entry' : 'entries'}? This action cannot be undone.
              {timeEntries.some(entry => selectedEntriesIds.includes(entry.id) && entry.invoiced) && (
                <div className="mt-2 p-2 border border-yellow-300 bg-yellow-50 rounded text-yellow-800">
                  <strong>Warning:</strong> Some selected entries have already been invoiced. Deleting them may cause inconsistencies with your Fortnox data.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteSelectedEntries();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isInvoiceDeleteDialogOpen} onOpenChange={setIsInvoiceDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-destructive mr-2" />
              Delete {selectedInvoiceIds.length} {selectedInvoiceIds.length === 1 ? 'Invoice' : 'Invoices'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedInvoiceIds.length} {selectedInvoiceIds.length === 1 ? 'invoice' : 'invoices'}? This action cannot be undone.
              
              {invoices.some(invoice => selectedInvoiceIds.includes(invoice.id) && invoice.exported_to_fortnox) && (
                <div className="mt-2 p-2 border border-yellow-300 bg-yellow-50 rounded text-yellow-800">
                  <strong>Warning:</strong> Some selected invoices have been exported to Fortnox. Deleting them will only remove them from your database, not from Fortnox.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingInvoices}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteSelectedInvoices();
              }}
              disabled={isDeletingInvoices}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingInvoices ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
