
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Clock, Package, Edit, Trash2 } from "lucide-react";
import { NoBadge, YesBadge } from "@/components/ui/YesNoBadge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/formatCurrency";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TimeEntryEditForm } from "@/components/time-tracking/TimeEntryEditForm";
import { deleteTimeEntry } from "@/lib/deleteTimeEntry";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TimeEntriesTableProps {
  bulkDeleteMode?: boolean;
  selectedItems?: string[];
  onItemSelect?: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
  onBulkDelete?: () => void;
  isCompact?: boolean;
  clientId?: string;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}

export function TimeEntriesTable({
  bulkDeleteMode,
  selectedItems = [],
  onItemSelect,
  onSelectAll,
  onBulkDelete,
  isCompact,
  clientId,
  userId,
  fromDate,
  toDate,
  searchTerm,
}: TimeEntriesTableProps) {
  const { t } = useTranslation();
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { data: timeEntries = [], isLoading, refetch } = useQuery({
    queryKey: [
      "time-entries",
      clientId,
      userId,
      fromDate ? fromDate.toISOString() : null,
      toDate ? toDate.toISOString() : null,
      searchTerm,
    ],
    queryFn: async () => {
      try {
        let query = supabase
          .from("time_entries")
          .select(`
            id, 
            description, 
            start_time, 
            end_time, 
            quantity, 
            created_at, 
            invoiced,
            client_id,
            product_id,
            user_id,
            invoice_id,
            custom_price,
            original_start_time,
            original_end_time,
            products:product_id (id, name, type, price),
            clients:client_id (id, name)
          `);
        
        if (clientId) {
          query = query.eq("client_id", clientId);
        }
        
        if (userId) {
          query = query.eq("user_id", userId);
        }
        
        if (fromDate) {
          query = query.gte("created_at", fromDate.toISOString());
        }
        
        if (toDate) {
          query = query.lte("created_at", toDate.toISOString());
        }
        
        if (searchTerm) {
          query = query.or(`description.ilike.%${searchTerm}%,clients.name.ilike.%${searchTerm}%`);
        }
        
        const { data, error } = await query.order("created_at", { ascending: false });
        
        if (error) {
          throw error;
        }
        
        // Get usernames for each entry
        const entriesWithUsernames = await Promise.all(
          (data || []).map(async (entry) => {
            let username = "Unknown";
            
            if (entry.user_id) {
              try {
                const { data: nameData, error: nameError } = await supabase.rpc(
                  'get_username',
                  { user_id: entry.user_id }
                );
                
                if (!nameError && nameData) {
                  username = nameData;
                }
              } catch (err) {
                console.error("Error fetching username:", err);
              }
            }
            
            return {
              ...entry,
              username
            };
          })
        );
        
        return entriesWithUsernames || [];
      } catch (error) {
        console.error("Error fetching time entries:", error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
  });

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours;
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    
    if (isCompact) {
      return `${h}h ${m > 0 ? m + 'm' : ''}`;
    }
    
    return `${h} ${t('timeTracking.hours')} ${m > 0 ? m + ' ' + t('timeTracking.minutes') : ''}`;
  };

  const getItemAmount = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = calculateDuration(entry.start_time, entry.end_time);
      return formatDuration(hours);
    } else if (entry.products?.type === "item" && entry.quantity) {
      return `${entry.quantity} ${t('timeTracking.units')}`;
    }
    return "-";
  };

  const getItemTotal = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = calculateDuration(entry.start_time, entry.end_time);
      const price = entry.custom_price || entry.products.price;
      return formatCurrency(hours * price);
    } else if (entry.products?.type === "item" && entry.quantity) {
      const price = entry.custom_price || entry.products.price;
      return formatCurrency(entry.quantity * price);
    }
    return "-";
  };

  const handleEditClick = (entry: any) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingEntry(null);
    refetch();
    toast.success(t("timeTracking.timeEntryUpdated"));
  };

  const handleDeleteClick = (entryId: string) => {
    setEntryToDelete(entryId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    
    const success = await deleteTimeEntry(entryToDelete);
    if (success) {
      toast.success(t("timeTracking.timeEntryDeleted"));
      refetch();
    } else {
      toast.error(t("timeTracking.deleteError"));
    }
    
    setEntryToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const filteredTimeEntries = timeEntries.filter(entry => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      entry.description?.toLowerCase().includes(search) ||
      entry.clients?.name?.toLowerCase().includes(search) ||
      entry.products?.name?.toLowerCase().includes(search) ||
      entry.products?.type?.toLowerCase().includes(search) ||
      entry.username?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table isCompact={isCompact}>
          <TableHeader>
            <TableRow isCompact={isCompact}>
              {bulkDeleteMode && (
                <TableHead isCompact={isCompact} className="w-[50px]">
                  <input
                    type="checkbox"
                    className={`${
                      isCompact ? "h-3 w-3" : "h-4 w-4"
                    } rounded border-gray-300 cursor-pointer`}
                    checked={
                      timeEntries.length > 0 &&
                      selectedItems.length === timeEntries.length
                    }
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                  />
                </TableHead>
              )}
              <TableHead isCompact={isCompact}>{t('clients.client')}</TableHead>
              <TableHead isCompact={isCompact}>{t('timeTracking.description')}</TableHead>
              <TableHead isCompact={isCompact}>{t('products.productType')}</TableHead>
              <TableHead isCompact={isCompact}>{t('invoices.amount')}</TableHead>
              <TableHead isCompact={isCompact}>{t('invoices.total')}</TableHead>
              <TableHead isCompact={isCompact}>{t('invoices.invoiced')}</TableHead>
              <TableHead isCompact={isCompact}>{t('administration.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow isCompact={isCompact}>
                <TableCell
                  colSpan={bulkDeleteMode ? 8 : 7}
                  className="h-24 text-center"
                  isCompact={isCompact}
                >
                  <div className="flex justify-center items-center">
                    <Loader2
                      className={`${
                        isCompact ? "h-5 w-5" : "h-6 w-6"
                      } animate-spin text-primary`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTimeEntries.length === 0 ? (
              <TableRow isCompact={isCompact}>
                <TableCell
                  colSpan={bulkDeleteMode ? 8 : 7}
                  className={`${
                    isCompact ? "h-20" : "h-24"
                  } text-center text-muted-foreground`}
                  isCompact={isCompact}
                >
                  {searchTerm ? t('timeTracking.noMatchingEntries') : t('timeTracking.noTimeEntriesFound')}
                </TableCell>
              </TableRow>
            ) : (
              filteredTimeEntries.map((entry) => (
                <TableRow
                  key={entry.id}
                  isCompact={isCompact}
                  data-entry-id={entry.id}
                >
                  {bulkDeleteMode && (
                    <TableCell isCompact={isCompact}>
                      <input
                        type="checkbox"
                        className={`${
                          isCompact ? "h-3 w-3" : "h-4 w-4"
                        } rounded border-gray-300 cursor-pointer`}
                        checked={selectedItems.includes(entry.id)}
                        onChange={() => onItemSelect?.(entry.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell
                    className="font-medium whitespace-nowrap"
                    isCompact={isCompact}
                  >
                    {entry.clients?.name || t('clients.unknownClient')}
                  </TableCell>
                  <TableCell className="max-w-[250px]" isCompact={isCompact}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="line-clamp-2 cursor-pointer">
                          {entry.description ||
                            (entry.products?.name || t('timeTracking.noDescription'))}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="max-w-[300px] p-4 text-wrap break-words">
                        <p>{entry.description || (entry.products?.name || t('timeTracking.noDescription'))}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('timeTracking.createdBy')}: {entry.username || t('common.unknown')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('timeTracking.createdAt')}: {format(new Date(entry.created_at), 'PPP p')}
                        </p>
                      </PopoverContent>
                    </Popover>
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
                  <TableCell isCompact={isCompact}>{getItemAmount(entry)}</TableCell>
                  <TableCell isCompact={isCompact} className="font-semibold">
                    {getItemTotal(entry)}
                  </TableCell>
                  <TableCell isCompact={isCompact}>
                    {entry.invoiced ? <YesBadge /> : <NoBadge />}
                  </TableCell>
                  <TableCell isCompact={isCompact}>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={isCompact ? "h-6 w-6" : "h-8 w-8"} 
                        onClick={() => handleEditClick(entry)}
                        disabled={entry.invoiced}
                      >
                        <Edit className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={isCompact 
                          ? "h-6 w-6 text-destructive hover:text-destructive/90 hover:bg-destructive/10" 
                          : "h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        } 
                        onClick={() => handleDeleteClick(entry.id)}
                        disabled={entry.invoiced}
                      >
                        <Trash2 className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          {editingEntry && (
            <TimeEntryEditForm 
              entry={editingEntry} 
              onSuccess={handleEditSuccess} 
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t('timeTracking.confirmDelete')}
        description={t('timeTracking.deleteWarning')}
        actionLabel={t('common.delete')}
        onAction={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
