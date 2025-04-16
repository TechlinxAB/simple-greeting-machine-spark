
import React from 'react';
import { format } from 'date-fns';
import { Invoice } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useIsMobile, useIsSmallScreen } from '@/hooks/use-mobile';

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
  onSelectAll
}: InvoicesTableProps) {
  const { toast } = useToast();
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const isMobile = useIsMobile();
  const isSmallScreen = useIsSmallScreen();

  const handleDeleteClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // First update related time entries to remove invoice_id
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .update({ invoice_id: null, invoiced: false })
        .eq('invoice_id', invoiceToDelete.id);
      
      if (timeEntriesError) {
        throw timeEntriesError;
      }
      
      // Then delete the invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);
      
      if (invoiceError) {
        throw invoiceError;
      }
      
      toast({
        title: "Invoice deleted",
        description: `Invoice #${invoiceToDelete.invoice_number} has been deleted.`,
      });
      
      onInvoiceDeleted();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        variant: "destructive",
        title: "Error deleting invoice",
        description: "There was an error deleting the invoice. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setInvoiceToDelete(null);
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

  // Mobile view for invoices
  const MobileInvoiceCard = ({ invoice }: { invoice: Invoice }) => (
    <div className="border rounded-md p-2 mb-2">
      <div className="flex justify-between items-start mb-1.5">
        <div>
          <div className="font-medium text-xs">{invoice.invoice_number}</div>
          <div className="text-[0.65rem] text-muted-foreground mt-0.5">
            {invoice.clients?.name}
          </div>
        </div>
        <Badge variant={getBadgeVariant(invoice.status || 'draft')} className="text-[0.65rem]">
          {invoice.status || 'draft'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-1 text-[0.65rem] mb-1.5">
        <div>
          <div className="text-muted-foreground">Issue Date</div>
          <div>{invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : 'N/A'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Due Date</div>
          <div>{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}</div>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="font-medium text-xs">
          {new Intl.NumberFormat('sv-SE', { 
            style: 'currency', 
            currency: 'SEK'
          }).format(invoice.total_amount || 0)}
        </div>
        
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(invoice)}
            className="h-6 w-6 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => handleDeleteClick(invoice)}
            className="h-6 w-6 p-0 text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <div className="p-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No invoices found
            </div>
          ) : (
            <>
              {bulkDeleteMode && (
                <div className="flex items-center mb-2 px-1">
                  <input 
                    type="checkbox" 
                    className="h-3.5 w-3.5 rounded border-gray-300 mr-2"
                    checked={invoices.length > 0 && selectedItems.length === invoices.length}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                  />
                  <span className="text-xs">Select all invoices</span>
                </div>
              )}
              
              {invoices.map((invoice) => (
                <div key={invoice.id}>
                  {bulkDeleteMode && (
                    <div className="flex items-center mb-1 ml-1">
                      <input 
                        type="checkbox" 
                        className="h-3.5 w-3.5 rounded border-gray-300"
                        checked={selectedItems.includes(invoice.id)}
                        onChange={() => onItemSelect?.(invoice.id)}
                      />
                    </div>
                  )}
                  <MobileInvoiceCard invoice={invoice} />
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {bulkDeleteMode && (
                  <TableHead className="w-[40px]">
                    <input 
                      type="checkbox" 
                      className="h-3.5 w-3.5 rounded border-gray-300"
                      checked={invoices.length > 0 && selectedItems.length === invoices.length}
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                    />
                  </TableHead>
                )}
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={bulkDeleteMode ? 8 : 7} className="h-20 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={bulkDeleteMode ? 8 : 7} className="h-20 text-center text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    {bulkDeleteMode && (
                      <TableCell>
                        <input 
                          type="checkbox" 
                          className="h-3.5 w-3.5 rounded border-gray-300"
                          checked={selectedItems.includes(invoice.id)}
                          onChange={() => onItemSelect?.(invoice.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.clients?.name}</TableCell>
                    <TableCell>
                      {invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(invoice.status || 'draft')} 
                         className="text-[0.65rem] sm:text-xs">
                        {invoice.status || 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('sv-SE', { 
                        style: 'currency', 
                        currency: 'SEK'
                      }).format(invoice.total_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDetails(invoice)}
                          className="h-6 w-6 sm:h-7 sm:w-7"
                        >
                          <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteClick(invoice)}
                          className="h-6 w-6 sm:h-7 sm:w-7 text-destructive"
                        >
                          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!invoiceToDelete}
        onOpenChange={() => setInvoiceToDelete(null)}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice #${invoiceToDelete?.invoice_number}? This will also mark all related time entries as unbilled.`}
        actionLabel={isDeleting ? "Deleting..." : "Delete"}
        onAction={handleDeleteConfirm}
        disabled={isDeleting}
        variant="destructive"
      />
    </>
  );
}
