
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Loader2, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/formatCurrency";

interface BulkDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEntries: any[];
  onConfirm: () => void;
  isDeleting: boolean;
  isCompact?: boolean;
}

export function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  selectedEntries,
  onConfirm,
  isDeleting,
  isCompact,
}: BulkDeleteConfirmDialogProps) {
  const { t } = useTranslation();

  // Format date/time for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "-";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const h = Math.floor(diffHours);
    const m = Math.round((diffHours - h) * 60);
    
    return `${h}h ${m > 0 ? m + 'm' : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('common.bulkDelete')}</DialogTitle>
          <DialogDescription>
            {t('administration.confirmBulkDelete', { count: selectedEntries.length })}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[300px] my-4 rounded-md border p-2">
          <Table isCompact={isCompact}>
            <TableHeader>
              <TableRow isCompact={isCompact}>
                <TableHead isCompact={isCompact}>{t('clients.client')}</TableHead>
                <TableHead isCompact={isCompact}>{t('timeTracking.description')}</TableHead>
                <TableHead isCompact={isCompact}>{t('products.productType')}</TableHead>
                <TableHead isCompact={isCompact}>{t('invoices.amount')}</TableHead>
                <TableHead isCompact={isCompact}>{t('invoices.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedEntries.map((entry) => (
                <TableRow key={entry.id} isCompact={isCompact}>
                  <TableCell className="font-medium" isCompact={isCompact}>
                    {entry.clients?.name || t('clients.unknownClient')}
                  </TableCell>
                  <TableCell isCompact={isCompact}>
                    {entry.description || 
                      (entry.products?.name || t('timeTracking.noDescription'))}
                  </TableCell>
                  <TableCell isCompact={isCompact}>
                    <div className="flex items-center gap-1">
                      {entry.products ? (
                        entry.products.type === 'activity' ? (
                          <Clock className={isCompact ? "h-3 w-3 text-blue-500" : "h-4 w-4 text-blue-500"} />
                        ) : (
                          <Package className={isCompact ? "h-3 w-3 text-primary" : "h-4 w-4 text-primary"} />
                        )
                      ) : (
                        <Package className={isCompact ? "h-3 w-3 text-amber-600" : "h-4 w-4 text-amber-600"} />
                      )}
                      <span className="capitalize">
                        {entry.products?.type === 'activity' 
                          ? t('products.activity') 
                          : entry.products?.type === 'item' 
                            ? t('products.item') 
                            : t('products.deletedProduct')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell isCompact={isCompact}>
                    {entry.products?.type === 'activity' && entry.start_time && entry.end_time
                      ? calculateDuration(entry.start_time, entry.end_time)
                      : entry.quantity ? `${entry.quantity} ${t('common.units')}` : "-"}
                  </TableCell>
                  <TableCell isCompact={isCompact} className="font-semibold">
                    {entry.products?.type === 'activity' && entry.start_time && entry.end_time 
                      ? formatCurrency(
                          (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 
                          (1000 * 60 * 60) * (entry.custom_price !== null ? entry.custom_price : entry.products?.price || 0)
                        )
                      : entry.quantity 
                        ? formatCurrency(entry.quantity * (entry.custom_price !== null ? entry.custom_price : entry.products?.price || 0))
                        : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.deleting')}...
              </>
            ) : (
              t('common.deleteSelected', { count: selectedEntries.length })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
