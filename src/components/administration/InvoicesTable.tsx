
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

interface InvoicesTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onInvoiceDeleted: () => void;
  onViewDetails: (invoice: Invoice) => void;
  bulkDeleteMode?: boolean;
  onBulkDelete?: () => void;
}

export function InvoicesTable({ 
  invoices, 
  isLoading, 
  onInvoiceDeleted, 
  onViewDetails,
  bulkDeleteMode = false,
  onBulkDelete
}: InvoicesTableProps) {
  const { toast } = useToast();
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.clients?.name}</TableCell>
                  <TableCell>
                    {invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(invoice.status || 'draft')}>
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
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewDetails(invoice)}
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteClick(invoice)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
