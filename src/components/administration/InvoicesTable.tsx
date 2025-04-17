import React from 'react';
import { format } from 'date-fns';
import { Invoice } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useIsLaptop } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { createFortnoxInvoice } from '@/integrations/fortnox';
import { fortnoxApiRequest } from '@/integrations/fortnox/api-client';
import { useTranslation } from "react-i18next";

interface InvoicesTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onInvoiceDeleted: () => void;
  onViewDetails: (invoice: Invoice) => void;
  bulkDeleteMode?: boolean;
  onBulkDelete?: () => void;
  selectedItems?: string[];
  onItemSelect?: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
  isCompact?: boolean;
  isAdmin?: boolean;
}

export function InvoicesTable({ 
  invoices, 
  isLoading, 
  onInvoiceDeleted, 
  onViewDetails,
  bulkDeleteMode = false,
  onBulkDelete,
  selectedItems = [],
  onItemSelect,
  onSelectAll,
  isCompact,
  isAdmin = false
}: InvoicesTableProps) {
  const { t } = useTranslation();
  const { toast: uiToast } = useToast();
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isResending, setIsResending] = React.useState<string | null>(null);
  const autoIsLaptop = useIsLaptop();
  
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;

  const handleDeleteClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .update({ invoice_id: null, invoiced: false })
        .eq('invoice_id', invoiceToDelete.id);
      
      if (timeEntriesError) {
        throw timeEntriesError;
      }
      
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);
      
      if (invoiceError) {
        throw invoiceError;
      }
      
      uiToast({
        title: "Invoice deleted",
        description: `Invoice #${invoiceToDelete.invoice_number} has been deleted.`,
      });
      
      onInvoiceDeleted();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      uiToast({
        variant: "destructive",
        title: "Error deleting invoice",
        description: "There was an error deleting the invoice. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setInvoiceToDelete(null);
    }
  };

  const handleResendInvoice = async (invoice: Invoice) => {
    if (!invoice.client_id) return;
    
    setIsResending(invoice.id);
    
    const loadingToastId = `resending-${invoice.id}`;
    
    try {
      toast.loading("Resending invoice to Fortnox...", {
        id: loadingToastId
      });
      
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from("time_entries")
        .select("id")
        .eq("invoice_id", invoice.id);
      
      if (timeEntriesError) {
        throw new Error(`Error fetching time entries: ${timeEntriesError.message}`);
      }
      
      if (!timeEntries || timeEntries.length === 0) {
        throw new Error("No time entries found for this invoice");
      }
      
      const timeEntryIds = timeEntries.map(entry => entry.id);
      
      const result = await createFortnoxInvoice(invoice.client_id, timeEntryIds, true);
      
      toast.dismiss(loadingToastId);
      toast.success(`Invoice was successfully resent to Fortnox with new invoice number: ${result.invoiceNumber}`);
      
      onInvoiceDeleted();
    } catch (error) {
      console.error("Error resending invoice to Fortnox:", error);
      
      toast.dismiss(loadingToastId);
      toast.error("Failed to resend invoice", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsResending(null);
    }
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

  return (
    <>
      <div className={`rounded-md border overflow-x-auto ${compact ? 'max-w-[calc(100vw-32px)]' : ''}`}>
        <Table isCompact={compact}>
          <TableHeader>
            <TableRow isCompact={compact}>
              {bulkDeleteMode && (
                <TableHead className="w-[50px]" isCompact={compact}>
                  <input 
                    type="checkbox" 
                    className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} rounded border-gray-300 cursor-pointer`}
                    checked={invoices.length > 0 && selectedItems.length === invoices.length}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                  />
                </TableHead>
              )}
              <TableHead isCompact={compact}>{t("invoices.invoiceNumber")}</TableHead>
              <TableHead isCompact={compact}>{t("invoices.clientName")}</TableHead>
              <TableHead isCompact={compact}>{t("invoices.issueDate")}</TableHead>
              <TableHead isCompact={compact}>{t("invoices.dueDate")}</TableHead>
              <TableHead isCompact={compact}>{t("invoices.status")}</TableHead>
              <TableHead className="text-right" isCompact={compact}>{t("invoices.amount")}</TableHead>
              <TableHead className="text-center" isCompact={compact}>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow isCompact={compact}>
                <TableCell colSpan={bulkDeleteMode ? 8 : 7} className="h-24 text-center" isCompact={compact}>
                  <div className="flex justify-center items-center">
                    <Loader2 className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} animate-spin text-primary`} />
                  </div>
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow isCompact={compact}>
                <TableCell colSpan={bulkDeleteMode ? 8 : 7} className={`${compact ? 'h-20' : 'h-24'} text-center text-muted-foreground`} isCompact={compact}>
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id} isCompact={compact}>
                  {bulkDeleteMode && (
                    <TableCell isCompact={compact}>
                      <input 
                        type="checkbox" 
                        className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} rounded border-gray-300 cursor-pointer`}
                        checked={selectedItems.includes(invoice.id)}
                        onChange={() => onItemSelect?.(invoice.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium" isCompact={compact}>{invoice.invoice_number}</TableCell>
                  <TableCell isCompact={compact}>{invoice.clients?.name}</TableCell>
                  <TableCell isCompact={compact}>
                    {invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell isCompact={compact}>
                    {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell isCompact={compact}>
                    <Badge variant={getBadgeVariant(invoice.status || 'draft')} className={compact ? "text-xs py-0.5" : ""}>
                      {invoice.status || 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" isCompact={compact}>
                    {new Intl.NumberFormat('sv-SE', { 
                      style: 'currency', 
                      currency: 'SEK'
                    }).format(invoice.total_amount || 0)}
                  </TableCell>
                  <TableCell isCompact={compact}>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewDetails(invoice)}
                        className={compact ? "h-6 w-6" : "h-8 w-8"}
                      >
                        <Eye className={compact ? "h-3 w-3" : "h-4 w-4"} />
                      </Button>
                      
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResendInvoice(invoice)}
                            className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-blue-600`}
                            disabled={isResending === invoice.id}
                          >
                            {isResending === invoice.id ? (
                              <Loader2 className={`animate-spin ${compact ? "h-3 w-3" : "h-4 w-4"}`} />
                            ) : (
                              <RefreshCw className={compact ? "h-3 w-3" : "h-4 w-4"} />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(invoice)}
                            className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-destructive`}
                          >
                            <Trash2 className={compact ? "h-3 w-3" : "h-4 w-4"} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!invoiceToDelete}
        onOpenChange={() => setInvoiceToDelete(null)}
        title={t("invoices.deleteInvoice")}
        description={t("invoices.confirmDelete")}
        actionLabel={isDeleting ? t("common.deleting") : t("common.delete")}
        onAction={handleDeleteConfirm}
        disabled={isDeleting}
        variant="destructive"
      />
    </>
  );
}
