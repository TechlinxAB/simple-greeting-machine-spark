
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  RefreshCcw, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Edit2, 
  Upload,
  FilePlus2
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { isFortnoxConnected } from "@/integrations/fortnox";
import { TimeEntriesTable } from "@/components/administration/TimeEntriesTable";
import { InvoicesTable } from "@/components/administration/InvoicesTable";
import { createFortnoxInvoice } from "@/integrations/fortnox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Invoice } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTimeEntry } from "@/lib/deleteTimeEntry";
import { InvoiceDetailsView } from "@/components/administration/InvoiceDetailsView";
import { DateRangeSelector } from "@/components/administration/DateRangeSelector";
import { ClientSelect } from "@/components/administration/ClientSelect";
import { UserSelect } from "@/components/administration/UserSelect";
import { AllTimeToggle } from "@/components/administration/AllTimeToggle";

export default function Administration() {
  const [activeTab, setActiveTab] = useState<string>("time-entries");
  const [searchTerm, setSearchTerm] = useState("");
  const [exportingInvoiceId, setExportingInvoiceId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [isAllTime, setIsAllTime] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<boolean>(false);
  const [isExportingInvoice, setIsExportingInvoice] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [timeEntryToDelete, setTimeEntryToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { role } = useAuth();

  const { data: invoicesData = [], isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices"],
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

  const invoices: Invoice[] = invoicesData.map(invoice => ({
    ...invoice,
    client_id: invoice.client_id
  }));

  const { data: fortnoxConnected = false } = useQuery({
    queryKey: ["fortnox-connected"],
    queryFn: async () => {
      return await isFortnoxConnected();
    },
  });

  const handleDeleteTimeEntry = async () => {
    if (!timeEntryToDelete) return;
    
    const success = await deleteTimeEntry(timeEntryToDelete);
    
    if (success) {
      toast.success("Time entry deleted successfully");
      refetchTimeEntries();
    }
    
    setTimeEntryToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const confirmDeleteTimeEntry = (entryId: string) => {
    setTimeEntryToDelete(entryId);
    setIsDeleteDialogOpen(true);
  };

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setFromDate(from);
    setToDate(to);
  };

  const handleCreateInvoice = async () => {
    if (!selectedClient) {
      toast.error("Please select a client with unbilled time entries");
      return;
    }

    setIsExportingInvoice(true);
    setErrorMessage(null);
    setProcessingStatus("Creating invoice...");
    
    try {
      setProcessingStatus("Checking and creating products in Fortnox...");
      const result = await createFortnoxInvoice(selectedClient, []);
      
      toast.success(`Invoice #${result.invoiceNumber} created and exported to Fortnox`, {
        description: "Any missing products were automatically created"
      });
      
      setIsCreatingInvoice(false);
      setSelectedClient("");
      refetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMsg.includes("Edge Function")) {
        setErrorMessage("Error connecting to Fortnox API. Please check your Fortnox connection in Settings.");
      } else {
        setErrorMessage(errorMsg);
      }
      
      toast.error(`Failed to create invoice`, {
        description: "Please check the error details in the dialog."
      });
    } finally {
      setIsExportingInvoice(false);
      setProcessingStatus("");
    }
  };

  const handleExportToFortnox = async (invoiceId: string) => {
    setExportingInvoiceId(invoiceId);
    
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ exported_to_fortnox: true })
        .eq("id", invoiceId);
        
      if (error) throw error;
      
      toast.success("Invoice exported to Fortnox successfully");
      refetchInvoices();
    } catch (error) {
      console.error("Error exporting invoice to Fortnox:", error);
      toast.error("Failed to export invoice to Fortnox");
    } finally {
      setExportingInvoiceId(null);
    }
  };

  const handleInvoiceDeleted = () => {
    refetchInvoices();
  };

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsOpen(true);
  };

  const filteredInvoices = searchTerm
    ? invoices.filter(invoice => 
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : invoices;

  const refetchTimeEntries = () => {
    // This function is empty because the TimeEntriesTable
    // component handles its own data fetching and refreshing
  };

  const handleItemSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    // This would be populated with time entry IDs when needed
    setSelectedItems(checked ? [] : []);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const promises = selectedItems.map(id => deleteTimeEntry(id));
      await Promise.all(promises);
      
      toast.success(`Successfully deleted ${selectedItems.length} time entries`);
      setSelectedItems([]);
      setBulkDeleteMode(false);
      refetchTimeEntries();
    } catch (error) {
      console.error("Error deleting time entries in bulk:", error);
      toast.error("Failed to delete some time entries");
    }
  };

  const toggleBulkDeleteMode = () => {
    setBulkDeleteMode(!bulkDeleteMode);
    setSelectedItems([]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Administration</h1>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder={activeTab === "invoices" ? "Search invoices..." : "Search time entries..."} 
              className="pl-8 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {activeTab === "invoices" && (
            <Button 
              className="flex items-center gap-2"
              onClick={() => setIsCreatingInvoice(true)}
              disabled={!fortnoxConnected}
            >
              <FilePlus2 className="h-4 w-4" />
              <span>New Invoice</span>
            </Button>
          )}
        </div>
      </div>
      
      <div className="bg-card rounded-md shadow-sm">
        <div className="flex border-b">
          <button
            className={`px-5 py-4 text-sm font-medium ${activeTab === "time-entries" ? "border-b-2 border-primary" : ""}`}
            onClick={() => setActiveTab("time-entries")}
          >
            Time Entries
          </button>
          <button
            className={`px-5 py-4 text-sm font-medium ${activeTab === "invoices" ? "border-b-2 border-primary" : ""}`}
            onClick={() => setActiveTab("invoices")}
          >
            Invoices
          </button>
        </div>
        
        {activeTab === "time-entries" && (
          <div className="p-6">
            <Card className="shadow-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Time Entries</CardTitle>
                <div className="flex items-center gap-2">
                  {bulkDeleteMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleBulkDeleteMode}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={selectedItems.length === 0}
                      >
                        Delete Selected ({selectedItems.length})
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2"
                      onClick={refetchTimeEntries}
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      <span>Refresh</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm font-medium mb-2">Filter by user</p>
                    <UserSelect
                      value={selectedUser}
                      onValueChange={setSelectedUser}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Filter by client</p>
                    <ClientSelect
                      value={selectedClient}
                      onValueChange={setSelectedClient}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Date filter</p>
                    <div className="flex items-center space-x-2">
                      <DateRangeSelector 
                        fromDate={isAllTime ? undefined : fromDate}
                        toDate={isAllTime ? undefined : toDate}
                        onDateChange={handleDateRangeChange}
                      />
                      <AllTimeToggle
                        isChecked={isAllTime}
                        onCheckedChange={setIsAllTime}
                      />
                    </div>
                  </div>
                </div>
                
                <TimeEntriesTable 
                  clientId={selectedClient}
                  userId={selectedUser}
                  fromDate={isAllTime ? undefined : fromDate}
                  toDate={isAllTime ? undefined : toDate}
                  searchTerm={searchTerm}
                  bulkDeleteMode={bulkDeleteMode}
                  selectedItems={selectedItems}
                  onItemSelect={handleItemSelect}
                  onSelectAll={handleSelectAll}
                  onBulkDelete={handleBulkDelete}
                  onEntryDeleted={refetchTimeEntries}
                />
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeTab === "invoices" && (
          <div className="p-6">
            <Card className="shadow-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Invoices</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchInvoices()}
                  className="flex items-center gap-2"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </Button>
              </CardHeader>
              
              <CardContent>
                <InvoicesTable
                  invoices={filteredInvoices}
                  isLoading={isLoadingInvoices}
                  onInvoiceDeleted={handleInvoiceDeleted}
                  onViewDetails={handleViewInvoiceDetails}
                />

                {!fortnoxConnected && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Fortnox integration is not connected. {
                        role === 'admin' 
                          ? <span>Go to <a href="/settings?tab=fortnox" className="text-blue-600 underline">Settings</a> to connect your Fortnox account.</span>
                          : <span>Please ask an administrator to connect Fortnox integration in Settings.</span>
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <Dialog open={isCreatingInvoice} onOpenChange={setIsCreatingInvoice}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Create and export a new invoice to Fortnox for a selected client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Client</label>
              <ClientSelect 
                value={selectedClient}
                onValueChange={setSelectedClient}
              />
            </div>
            
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTitle>Error creating invoice</AlertTitle>
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreatingInvoice(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateInvoice} 
              disabled={!selectedClient || isExportingInvoice}
              className="flex items-center gap-2"
            >
              {isExportingInvoice ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Create & Export</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Time Entry"
        description="Are you sure you want to delete this time entry? This action cannot be undone."
        actionLabel="Delete"
        onAction={handleDeleteTimeEntry}
        variant="destructive"
      />

      {selectedInvoice && (
        <InvoiceDetailsView 
          invoice={selectedInvoice} 
          open={isDetailsOpen} 
          onClose={() => setIsDetailsOpen(false)} 
        />
      )}
    </div>
  );
}
