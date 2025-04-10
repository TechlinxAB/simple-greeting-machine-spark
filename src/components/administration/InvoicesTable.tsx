
import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/formatCurrency";
import { type Invoice } from "@/types";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Trash2, Edit, ArrowUpDown, AlertCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface InvoicesTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onInvoiceDeleted: () => void;
  bulkDeleteMode?: boolean;
  selectedItems?: string[];
  onItemSelect?: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
  onSort?: (field: string) => void;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc';
}

export function InvoicesTable({
  invoices,
  isLoading,
  onInvoiceDeleted,
  bulkDeleteMode = false,
  selectedItems = [],
  onItemSelect = () => {},
  onSelectAll = () => {},
  onSort = () => {},
  sortField = null,
  sortDirection = 'desc'
}: InvoicesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasTimeEntries, setHasTimeEntries] = useState(false);

  const handleDeleteClick = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id")
        .eq("invoice_id", invoice.id)
        .limit(1);
      
      if (error) {
        console.error("Error checking invoice references:", error);
        toast.error("Failed to check if invoice can be deleted");
        return;
      }
      
      setHasTimeEntries(data && data.length > 0);
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error("Error checking time entries:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    
    setIsDeleting(true);
    
    try {
      if (hasTimeEntries) {
        const { error: updateError } = await supabase
          .from("time_entries")
          .update({ 
            invoice_id: null,
            invoiced: false 
          })
          .eq("invoice_id", selectedInvoice.id);
        
        if (updateError) {
          console.error("Error updating time entries:", updateError);
          toast.error("Failed to update related time entries");
          return;
        }
      }
      
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", selectedInvoice.id);
      
      if (error) {
        console.error("Error deleting invoice:", error);
        toast.error("Failed to delete invoice");
        return;
      }
      
      onInvoiceDeleted();
      toast.success("Invoice deleted successfully");
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'sent':
        return <Badge variant="secondary">Sent</Badge>;
      case 'paid':
        return <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No invoices found</h3>
        <p className="text-muted-foreground mt-1">
          No invoices match your current filters.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div className="font-medium">
                    {invoice.invoice_number || "N/A"}
                  </div>
                  {invoice.exported_to_fortnox && (
                    <div className="text-xs text-blue-500">
                      Exported to Fortnox {invoice.fortnox_invoice_id ? `#${invoice.fortnox_invoice_id}` : ""}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {invoice.clients?.name || "Unknown client"}
                </TableCell>
                <TableCell>
                  {invoice.issue_date ? format(new Date(invoice.issue_date), "MMM d, yyyy") : "N/A"}
                </TableCell>
                <TableCell>
                  {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "N/A"}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('sv-SE', { 
                    style: 'currency', 
                    currency: 'SEK'
                  }).format(invoice.total_amount || 0)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(invoice.status || '')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(invoice)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title={
                        invoice.exported_to_fortnox
                          ? "Warning: This will only delete from database, not from Fortnox"
                          : "Delete invoice"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedInvoice?.exported_to_fortnox ? (
                <div className="flex items-start gap-2 mb-2 text-amber-500">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Warning: This invoice has been exported to Fortnox</p>
                    <p>Deleting this invoice will only remove it from your database. It will <strong>not</strong> be deleted from Fortnox. This may cause data inconsistency.</p>
                  </div>
                </div>
              ) : null}
              
              {hasTimeEntries ? (
                <div className="flex items-start gap-2 mb-2 mt-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-500">This invoice has time entries attached</p>
                    <p>Deleting this invoice will remove the invoice association from these time entries, 
                    making them available for invoicing again.</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2">Are you sure you want to delete this invoice? This action is irreversible.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
