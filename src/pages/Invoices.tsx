import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Search, FileText, RefreshCcw, Upload, Trash2, Edit2, CheckCircle, XCircle } from "lucide-react";
import { FilePlus2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, differenceInHours, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { isFortnoxConnected } from "@/integrations/fortnox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createFortnoxInvoice } from "@/integrations/fortnox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InvoicesTable } from "@/components/administration/InvoicesTable";
import { type Invoice } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTimeEntry } from "@/lib/deleteTimeEntry";
import { TimeEntryEditForm } from "@/components/time-tracking/TimeEntryEditForm";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { DateRangeSelector } from "@/components/administration/DateRangeSelector";
import { InvoiceDetailsView } from "@/components/administration/InvoiceDetailsView";

const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffHours = differenceInHours(end, start);
  const diffMinutes = differenceInMinutes(end, start) % 60;
  return parseFloat((diffHours + diffMinutes / 60).toFixed(2));
};

const formatDuration = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};

type TimeEntryWithProfile = {
  id: string;
  user_id: string;
  start_time?: string;
  end_time?: string;
  quantity?: number;
  description?: string;
  created_at?: string;
  custom_price?: number;
  products?: {
    id: string;
    name: string;
    type: string;
    price: number;
    vat_percentage: number;
    article_number?: string;
    account_number?: string;
  };
  user_profile?: {
    id?: string;
    name?: string;
  };
};

export default function Invoices() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [exportingInvoiceId, setExportingInvoiceId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<boolean>(false);
  const [isExportingInvoice, setIsExportingInvoice] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [timeEntryToDelete, setTimeEntryToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [timeEntryToEdit, setTimeEntryToEdit] = useState<TimeEntryWithProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [excludedEntries, setExcludedEntries] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { role } = useAuth();

  const { data: invoicesData = [], isLoading, refetch } = useQuery({
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

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: unbilledEntries = [], refetch: refetchUnbilled } = useQuery<TimeEntryWithProfile[]>({
    queryKey: ["unbilled-entries", selectedClient, fromDate, toDate],
    queryFn: async () => {
      if (!selectedClient) return [];
      
      let query = supabase
        .from("time_entries")
        .select(`
          id, 
          user_id,
          start_time, 
          end_time, 
          quantity, 
          description,
          created_at,
          products:product_id (id, name, type, price, vat_percentage, article_number, account_number)
        `)
        .eq("client_id", selectedClient)
        .eq("invoiced", false);
      
      if (fromDate) {
        query = query.or(`start_time.gte.${fromDate.toISOString()},and(start_time.is.null,created_at.gte.${fromDate.toISOString()})`);
      }
      
      if (toDate) {
        query = query.or(`start_time.lte.${toDate.toISOString()},and(start_time.is.null,created_at.lte.${toDate.toISOString()})`);
      }
      
      const { data: entriesData, error: entriesError } = await query;
      
      if (entriesError) throw entriesError;
      
      if (entriesData && entriesData.length > 0) {
        const userIds = entriesData.map(entry => entry.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        
        if (profilesError) throw profilesError;
        
        const userProfileMap = new Map();
        if (profiles) {
          profiles.forEach(profile => {
            userProfileMap.set(profile.id, profile);
          });
        }
        
        return entriesData.map(entry => ({
          ...entry,
          user_profile: userProfileMap.get(entry.user_id) || { name: 'Unknown User' }
        }));
      }
      
      return entriesData || [];
    },
    enabled: !!selectedClient,
  });

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
      refetchUnbilled();
    }
    
    setTimeEntryToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const confirmDeleteTimeEntry = (entryId: string) => {
    setTimeEntryToDelete(entryId);
    setIsDeleteDialogOpen(true);
  };

  const toggleExcludeEntry = (entryId: string) => {
    setExcludedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId) 
        : [...prev, entryId]
    );
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default" as const;
      case "sent":
        return "secondary" as const;
      case "overdue":
        return "destructive" as const;
      default:
        return "outline" as const;
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
      refetch();
    } catch (error) {
      console.error("Error exporting invoice to Fortnox:", error);
      toast.error("Failed to export invoice to Fortnox");
    } finally {
      setExportingInvoiceId(null);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedClient || unbilledEntries.length === 0) {
      toast.error("Please select a client with unbilled time entries");
      return;
    }

    setIsExportingInvoice(true);
    setErrorMessage(null);
    setProcessingStatus("Creating invoice...");
    
    try {
      const includedEntries = unbilledEntries.filter(entry => !excludedEntries.includes(entry.id));
      
      if (includedEntries.length === 0) {
        toast.error("All entries have been excluded. Cannot create an empty invoice.");
        setIsExportingInvoice(false);
        return;
      }
      
      const timeEntryIds = includedEntries.map(entry => entry.id);
      
      setProcessingStatus("Verifying articles in Fortnox...");
      const result = await createFortnoxInvoice(selectedClient, timeEntryIds);
      
      toast.success(`Invoice #${result.invoiceNumber} created and exported to Fortnox`, {
        description: "Invoice has been successfully created in Fortnox"
      });
      
      setIsCreatingInvoice(false);
      setSelectedClient("");
      setExcludedEntries([]);
      refetch();
      refetchUnbilled();
    } catch (error) {
      console.error("Error creating invoice:", error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMsg.includes("Edge Function")) {
        setErrorMessage("Error connecting to Fortnox API. Please check your Fortnox connection in Settings.");
      } else if (errorMsg.includes("Article not found") || errorMsg.includes("Missing Fortnox articles")) {
        setErrorMessage(`${errorMsg} Please create the missing article(s) in Fortnox before proceeding.`);
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

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setFromDate(from);
    setToDate(to);
  };

  const calculateTotal = () => {
    let total = 0;
    
    unbilledEntries
      .filter(entry => !excludedEntries.includes(entry.id))
      .forEach(entry => {
        if (entry.products) {
          let quantity = 1;
          
          if (entry.products.type === 'activity' && entry.start_time && entry.end_time) {
            const start = new Date(entry.start_time);
            const end = new Date(entry.end_time);
            const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            quantity = parseFloat(diffHours.toFixed(2));
          } else if (entry.products.type === 'item' && entry.quantity) {
            quantity = entry.quantity;
          }
          
          total += entry.products.price * quantity;
        }
      });
    
    return total.toFixed(2);
  };

  const filteredInvoices = searchTerm
    ? invoices.filter(invoice => 
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : invoices;

  const hasInvalidArticleNumbers = unbilledEntries
    .filter(entry => !excludedEntries.includes(entry.id))
    .some(entry => 
      entry.products?.article_number && 
      !/^\d+$/.test(entry.products.article_number)
    );

  const missingArticleNumbers = unbilledEntries
    .filter(entry => !excludedEntries.includes(entry.id))
    .some(entry => 
      !entry.products?.article_number
    );

  const handleInvoiceDeleted = () => {
    refetch();
  };

  const handleEditTimeEntry = (entry: TimeEntryWithProfile) => {
    setTimeEntryToEdit(entry);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setTimeEntryToEdit(null);
    refetchUnbilled();
    toast.success("Time entry updated successfully");
  };

  const resetExclusions = () => {
    setExcludedEntries([]);
    toast.success("All entries are now included");
  };

  const getItemAmount = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = calculateDuration(entry.start_time, entry.end_time);
      return formatDuration(hours);
    } else if (entry.products?.type === "item" && entry.quantity) {
      return `${entry.quantity} units`;
    }
    return "-";
  };

  const getEntryDate = (entry: TimeEntryWithProfile): string => {
    if (entry.start_time) {
      return format(parseISO(entry.start_time), 'yyyy-MM-dd');
    } else if (entry.created_at) {
      return format(parseISO(entry.created_at), 'yyyy-MM-dd');
    }
    return 'N/A';
  };

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">{t("invoices.title")}</h1>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder={t("invoices.searchInvoices")}
              className="pl-8 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button 
            className="flex items-center gap-2"
            onClick={() => setIsCreatingInvoice(true)}
            disabled={!fortnoxConnected}
          >
            <FilePlus2 className="h-4 w-4" />
            <span>{t("invoices.newInvoice")}</span>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("invoices.allInvoices")}</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            <span>{t("common.refresh")}</span>
          </Button>
        </CardHeader>
        <CardContent>
          <InvoicesTable
            invoices={filteredInvoices}
            isLoading={isLoading}
            onInvoiceDeleted={handleInvoiceDeleted}
            onViewDetails={handleViewInvoiceDetails}
          />

          {!fortnoxConnected && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                {t("settings.fortnoxDisconnected")} {
                  role === 'admin' 
                    ? t("settings.connectFortnoxAdmin")
                    : t("settings.connectFortnoxUser")
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedInvoice && (
        <InvoiceDetailsView 
          invoice={selectedInvoice} 
          open={isDetailsOpen} 
          onClose={() => setIsDetailsOpen(false)} 
        />
      )}
      
      <Dialog open={isCreatingInvoice} onOpenChange={setIsCreatingInvoice}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Create and export a new invoice to Fortnox for a selected client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 flex-1 overflow-hidden">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedClient && (
              <div className="flex flex-col md:flex-row gap-4 mb-2">
                <div className="w-full">
                  <label className="text-sm font-medium block mb-2">Time span</label>
                  <DateRangeSelector 
                    fromDate={fromDate}
                    toDate={toDate}
                    onDateChange={handleDateRangeChange}
                  />
                </div>
              </div>
            )}
            
            {(hasInvalidArticleNumbers || missingArticleNumbers) && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-800" />
                <AlertTitle className="text-blue-800">Automatic product creation</AlertTitle>
                <AlertDescription className="text-blue-700">
                  {hasInvalidArticleNumbers && 
                    "Some products have non-numeric article numbers. "}
                  {missingArticleNumbers && 
                    "Some products don't have article numbers. "}
                  The system will automatically create these products in Fortnox during invoice creation.
                </AlertDescription>
              </Alert>
            )}
            
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error creating invoice</AlertTitle>
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {processingStatus && (
              <Alert className="bg-blue-50 border-blue-200">
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <AlertTitle className="text-blue-800">{processingStatus}</AlertTitle>
                <AlertDescription className="text-blue-700">
                  This may take a moment if products need to be created in Fortnox.
                </AlertDescription>
              </Alert>
            )}
            
            {selectedClient && (
              <div className="space-y-3 flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Unbilled Time Entries</h3>
                  <div className="flex items-center gap-2">
                    {excludedEntries.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={resetExclusions}
                        className="h-8 text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Include All ({excludedEntries.length} excluded)
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => refetchUnbilled()}
                      className="h-8"
                    >
                      <RefreshCcw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  </div>
                </div>
                
                {unbilledEntries.length === 0 ? (
                  <div className="text-center py-4 border rounded-md bg-muted/20">
                    <p className="text-sm text-muted-foreground">No unbilled time entries for this client and selected time span.</p>
                  </div>
                ) : (
                  <ScrollArea className="border rounded-md h-[calc(80vh-400px)] min-h-[400px]">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Art. Number</TableHead>
                            <TableHead className="text-right">Amount (SEK)</TableHead>
                            <TableHead className="w-[100px]">Include</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unbilledEntries.map((entry) => {
                            let quantity = 1;
                            
                            if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
                              const start = new Date(entry.start_time);
                              const end = new Date(entry.end_time);
                              const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                              quantity = parseFloat(diffHours.toFixed(2));
                            } else if (entry.products?.type === 'item' && entry.quantity) {
                              quantity = entry.quantity;
                            }
                            
                            const amount = entry.products ? entry.products.price * quantity : 0;
                            
                            const hasValidArticleNumber = 
                              entry.products?.article_number && 
                              /^\d+$/.test(entry.products.article_number);
                            
                            const unit = entry.products?.type === 'activity' ? 't' : 'st';
                            
                            const entryDate = getEntryDate(entry);
                              
                            const isExcluded = excludedEntries.includes(entry.id);
                            
                            return (
                              <TableRow key={entry.id} className={isExcluded ? "bg-muted/30" : ""}>
                                <TableCell className="font-medium max-w-[200px]">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="text-left truncate block w-full">
                                        <span className={`truncate block ${isExcluded ? "text-muted-foreground line-through" : ""}`}>
                                          {entry.description || 'No description'}
                                        </span>
                                      </TooltipTrigger>
                                      {entry.description && (
                                        <TooltipContent side="bottom" className="max-w-[300px] p-3">
                                          <p className="font-medium mb-1">Description:</p>
                                          <p className="text-sm">{entry.description}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className={isExcluded ? "text-muted-foreground" : ""}>
                                  {entry.user_profile?.name || 'Unknown'}
                                </TableCell>
                                <TableCell className={isExcluded ? "text-muted-foreground" : ""}>
                                  {entry.products?.name || 'Unknown Product'}
                                </TableCell>
                                <TableCell className={isExcluded ? "text-muted-foreground" : ""}>
                                  {entryDate}
                                </TableCell>
                                <TableCell className={isExcluded ? "text-muted-foreground" : ""}>
                                  {quantity} {unit}
                                </TableCell>
                                <TableCell className={isExcluded ? "text-muted-foreground" : ""}>
                                  {entry.products?.article_number ? (
                                    hasValidArticleNumber ? (
                                      entry.products.article_number
                                    ) : (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="text-blue-600 font-medium cursor-help">
                                              {entry.products.article_number}*
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>This article number will be created in Fortnox</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-blue-600 italic cursor-help">
                                            Auto-generate
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>A new article number will be generated and created in Fortnox</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </TableCell>
                                <TableCell className={`text-right ${isExcluded ? "text-muted-foreground" : ""}`}>
                                  {amount.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => toggleExcludeEntry(entry.id)}
                                    className={`h-8 w-8 ${isExcluded ? "text-primary hover:text-primary/80" : "text-destructive hover:text-destructive/80"}`}
                                    title={isExcluded ? "Include in invoice" : "Exclude from invoice"}
                                  >
                                    {isExcluded ? (
                                      <CheckCircle className="h-4 w-4" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditTimeEntry(entry)}
                                      className="h-8 w-8 text-primary hover:text-primary/80"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => confirmDeleteTimeEntry(entry.id)}
                                      className="h-8 w-8 text-destructive hover:text-destructive/80"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow>
                            <TableCell colSpan={6} className="font-bold text-right">Total:</TableCell>
                            <TableCell className="font-bold text-right">{calculateTotal()} SEK</TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreatingInvoice(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateInvoice} 
              disabled={
                !selectedClient || 
                unbilledEntries.length === 0 || 
                isExportingInvoice || 
                unbilledEntries.every(entry => excludedEntries.includes(entry.id))
              }
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

      {timeEntryToEdit && (
        <DialogWrapper
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          title="Edit Time Entry"
          description="Make changes to this time entry."
        >
          <TimeEntryEditForm
            timeEntry={{
              id: timeEntryToEdit.id,
              description: timeEntryToEdit.description,
              start_time: timeEntryToEdit.start_time,
              end_time: timeEntryToEdit.end_time,
              quantity: timeEntryToEdit.quantity,
              custom_price: timeEntryToEdit.custom_price,
              products: timeEntryToEdit.products,
              clients: { id: selectedClient || "", name: "" }
            }}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogWrapper>
      )}
    </div>
  );
}
