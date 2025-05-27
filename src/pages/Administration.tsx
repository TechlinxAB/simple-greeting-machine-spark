import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Trash2, 
  Upload,
  FilePlus2,
  Users
} from "lucide-react";
import { format, startOfMonth, endOfMonth, setMonth, setYear } from "date-fns";
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
import { ClientSelect } from "@/components/administration/ClientSelect";
import { UserSelect } from "@/components/administration/UserSelect";
import { AllTimeToggle } from "@/components/administration/AllTimeToggle";
import { MonthYearPicker } from "@/components/administration/MonthYearPicker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsLaptop } from "@/hooks/use-mobile";
import { UsersTable } from "@/components/administration/UsersTable";

export default function Administration() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("time-entries");
  const [searchTerm, setSearchTerm] = useState("");
  const [exportingInvoiceId, setExportingInvoiceId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("all-clients");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [isAllTime, setIsAllTime] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<boolean>(false);
  const [isExportingInvoice, setIsExportingInvoice] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [timeEntryToDelete, setTimeEntryToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { role } = useAuth();
  const isLaptop = useIsLaptop();

  const fromDate = isAllTime ? undefined : startOfMonth(setYear(setMonth(new Date(), selectedMonth), selectedYear));
  const toDate = isAllTime ? undefined : endOfMonth(setYear(setMonth(new Date(), selectedMonth), selectedYear));

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

  const handleCreateInvoice = async () => {
    if (!selectedClient || selectedClient === "all-clients") {
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
      setSelectedClient("all-clients");
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
    // This function is a placeholder since the TimeEntriesTable
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
    if (checked) {
      // This will be populated with time entry IDs by the TimeEntriesTable component
      // when the user confirms selection of invoiced entries
      const timeEntriesData = document.querySelectorAll('[data-entry-id]');
      const allIds = Array.from(timeEntriesData).map(el => (el as HTMLElement).dataset.entryId || '');
      setSelectedItems(allIds.filter(Boolean));
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkDelete = async () => {
    // Don't do anything here - the actual delete happens in the TimeEntriesTable component
    // This is just to clear state after deletion
    setSelectedItems([]);
  };

  const toggleBulkDeleteMode = () => {
    setBulkDeleteMode(!bulkDeleteMode);
    setSelectedItems([]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className={`${isLaptop ? 'text-xl' : 'text-2xl'} font-bold`}>{t('common.administration')}</h1>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-grow">
            <Search className={`absolute left-2.5 top-2.5 ${isLaptop ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-muted-foreground`} />
            <input
              placeholder={
                activeTab === "invoices" 
                  ? t('common.searchInvoices')
                  : activeTab === "users" 
                    ? t('common.searchUsers')
                    : t('common.searchTimeEntries')
              }
              className={`pl-8 ${isLaptop ? 'h-9 text-xs' : 'h-10 text-sm'} w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex h-9 items-center justify-center rounded-md bg-muted/30 text-muted-foreground w-auto mb-4">
            <TabsTrigger 
              value="time-entries" 
              className="inline-flex items-center justify-center whitespace-nowrap px-6 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              {t('common.timeEntries')}
            </TabsTrigger>
            <TabsTrigger 
              value="invoices"
              className="inline-flex items-center justify-center whitespace-nowrap px-6 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              {t('common.invoices')}
            </TabsTrigger>
            <TabsTrigger 
              value="users"
              className="inline-flex items-center justify-center whitespace-nowrap px-6 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              {t('common.users')}
            </TabsTrigger>
          </TabsList>
          
          <div className="bg-transparent rounded-md">
            <TabsContent value="time-entries" className="m-0">
              <div className={isLaptop ? "p-3" : "p-6"}>
                <div className={isLaptop ? "mb-4" : "mb-6"}>
                  <div className={`flex justify-between items-center ${isLaptop ? 'mb-4' : 'mb-6'}`}>
                    <h2 className={isLaptop ? "text-lg font-bold" : "text-xl font-bold"}>{t('common.timeEntries')}</h2>
                    <div className="flex items-center gap-2">
                      {bulkDeleteMode ? (
                        <>
                          <Button
                            variant="outline"
                            size={isLaptop ? "sm" : "default"}
                            onClick={toggleBulkDeleteMode}
                            className={isLaptop ? "text-xs h-8 px-2" : ""}
                          >
                            {t('common.cancel')}
                          </Button>
                          <Button
                            variant="destructive"
                            size={isLaptop ? "sm" : "default"}
                            onClick={() => selectedItems.length > 0 && handleBulkDelete()}
                            disabled={selectedItems.length === 0}
                            className={isLaptop ? "text-xs h-8 px-2" : ""}
                          >
                            {t('common.deleteSelected', { count: selectedItems.length })}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size={isLaptop ? "sm" : "default"}
                          className={`flex items-center gap-2 ${isLaptop ? "text-xs h-8 px-2" : ""}`}
                          onClick={toggleBulkDeleteMode}
                        >
                          <Trash2 className={isLaptop ? "h-3 w-3" : "h-3.5 w-3.5"} />
                          <span>{t('common.bulkDelete')}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Filter Section - Full width to match table */}
                  <div className="w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
                      <div>
                        <p className={`${isLaptop ? 'text-xs' : 'text-sm'} font-medium mb-1`}>{t('common.filterByUser')}</p>
                        <UserSelect
                          value={selectedUser}
                          onChange={setSelectedUser}
                        />
                      </div>
                      <div>
                        <p className={`${isLaptop ? 'text-xs' : 'text-sm'} font-medium mb-1`}>{t('common.filterByClient')}</p>
                        <ClientSelect
                          value={selectedClient}
                          onChange={setSelectedClient}
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <p className={`${isLaptop ? 'text-xs' : 'text-sm'} font-medium mb-1`}>{t('common.dateFilter')}</p>
                        <div className="flex items-center gap-2">
                          <AllTimeToggle
                            isAllTime={isAllTime}
                            onAllTimeChange={setIsAllTime}
                          />
                          {!isAllTime && (
                            <MonthYearPicker
                              selectedMonth={selectedMonth}
                              selectedYear={selectedYear}
                              onMonthChange={setSelectedMonth}
                              onYearChange={setSelectedYear}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <TimeEntriesTable 
                  clientId={selectedClient === "all-clients" ? undefined : selectedClient}
                  userId={selectedUser === "all" ? undefined : selectedUser}
                  fromDate={fromDate}
                  toDate={toDate}
                  searchTerm={searchTerm}
                  bulkDeleteMode={bulkDeleteMode}
                  selectedItems={selectedItems}
                  onItemSelect={handleItemSelect}
                  onSelectAll={handleSelectAll}
                  onBulkDelete={handleBulkDelete}
                  isCompact={isLaptop}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="invoices" className="m-0">
              <div className={isLaptop ? "p-3" : "p-6"}>
                <div className={`flex justify-between items-center ${isLaptop ? 'mb-4' : 'mb-6'}`}>
                  <h2 className={isLaptop ? "text-lg font-bold" : "text-xl font-bold"}>{t('common.invoices')}</h2>
                </div>
                
                <InvoicesTable
                  invoices={filteredInvoices}
                  isLoading={isLoadingInvoices}
                  onInvoiceDeleted={handleInvoiceDeleted}
                  onViewDetails={handleViewInvoiceDetails}
                  isCompact={isLaptop}
                  isAdmin={true}
                />

                {!fortnoxConnected && (
                  <div className={`mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md ${isLaptop ? 'text-xs' : 'text-sm'}`}>
                    <p className="text-yellow-800">
                      Fortnox integration is not connected. {
                        role === 'admin' 
                          ? <span>Go to <a href="/settings?tab=fortnox" className="text-blue-600 underline">Settings</a> to connect your Fortnox account.</span>
                          : <span>Please ask an administrator to connect Fortnox integration in Settings.</span>
                      }
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="m-0">
              <div className={isLaptop ? "p-3" : "p-6"}>
                <div className={`flex justify-between items-center ${isLaptop ? 'mb-4' : 'mb-6'}`}>
                  <h2 className={isLaptop ? "text-lg font-bold" : "text-xl font-bold"}>{t('common.users')}</h2>
                </div>
                <UsersTable 
                  searchTerm={searchTerm}
                  isCompact={isLaptop}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      <Dialog open={isCreatingInvoice} onOpenChange={setIsCreatingInvoice}>
        <DialogContent className={`max-w-lg ${isLaptop ? 'p-4 text-sm' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isLaptop ? "text-base" : ""}>{t('common.createInvoice')}</DialogTitle>
            <DialogDescription className={isLaptop ? "text-xs" : ""}>
              Create and export a new invoice to Fortnox for a selected client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className={`${isLaptop ? 'text-xs' : 'text-sm'} font-medium`}>{t('common.selectClient')}</label>
              <ClientSelect 
                value={selectedClient}
                onChange={setSelectedClient}
              />
            </div>
            
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTitle className={isLaptop ? "text-xs" : ""}>{t('common.errorCreatingInvoice')}</AlertTitle>
                <AlertDescription className={isLaptop ? "text-xs" : ""}>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsCreatingInvoice(false)}
              className={isLaptop ? "text-xs h-8 px-3" : ""}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleCreateInvoice} 
              disabled={!selectedClient || isExportingInvoice}
              className={`flex items-center gap-2 ${isLaptop ? "text-xs h-8 px-3" : ""}`}
            >
              {isExportingInvoice ? (
                <>
                  <div className={`animate-spin ${isLaptop ? 'h-3 w-3' : 'h-4 w-4'} border-2 border-current border-t-transparent rounded-full`} />
                  <span>{t('common.processing')}</span>
                </>
              ) : (
                <>
                  <Upload className={isLaptop ? "h-3 w-3" : "h-4 w-4"} />
                  <span>{t('common.createAndExport')}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t('common.deleteTimeEntry')}
        description={t('common.confirmDeleteTimeEntry')}
        actionLabel={t('common.delete')}
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
