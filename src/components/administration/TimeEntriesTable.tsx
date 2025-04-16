
import { format, formatDistanceToNow } from "date-fns";
import { CalendarClock, Clock, Loader2, Package, Trash2, ArrowUpDown, Check, AlertCircle, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TimeEntryEditForm } from "@/components/time-tracking/TimeEntryEditForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { TimeEntry } from "@/types";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { deleteTimeEntry } from "@/lib/deleteTimeEntry";

interface TimeEntriesTableProps {
  timeEntries?: TimeEntry[];
  isLoading?: boolean;
  onEntryDeleted?: () => void;
  bulkDeleteMode?: boolean;
  selectedItems?: string[];
  onItemSelect?: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
  onBulkDelete?: () => void;
  onSort?: (field: string) => void;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc';
  clientId?: string;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
  isCompact?: boolean;
}

interface SortableHeaderProps {
  field: string;
  children: React.ReactNode;
  className?: string;
}

export function TimeEntriesTable({ 
  timeEntries: externalTimeEntries, 
  isLoading: externalIsLoading, 
  onEntryDeleted = () => {},
  bulkDeleteMode = false,
  selectedItems = [],
  onItemSelect = () => {},
  onSelectAll = () => {},
  onBulkDelete = () => {},
  onSort,
  sortField,
  sortDirection = 'asc',
  clientId,
  userId,
  fromDate,
  toDate,
  searchTerm,
  isCompact = false
}: TimeEntriesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [invoicedWarningOpen, setInvoicedWarningOpen] = useState(false);
  const [pendingInvoicedId, setPendingInvoicedId] = useState<string | null>(null);
  const [pendingSelectAll, setPendingSelectAll] = useState<boolean>(false);
  
  const {
    data: fetchedTimeEntries = [],
    isLoading: isFetchingTimeEntries,
  } = useQuery({
    queryKey: ["time-entries", clientId, userId, fromDate, toDate, searchTerm],
    queryFn: async () => {
      try {
        console.log("Fetching time entries with filters:", { clientId, userId, fromDate, toDate, searchTerm });
        
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
            products(id, name, type, price),
            clients(id, name)
          `);
        
        if (clientId) {
          query = query.eq("client_id", clientId);
        }
        
        if (userId && userId !== "all") {
          query = query.eq("user_id", userId);
        }
        
        if (fromDate) {
          query = query.gte("created_at", fromDate.toISOString());
        }
        
        if (toDate) {
          query = query.lte("created_at", toDate.toISOString());
        }

        if (searchTerm) {
          query = query.or(`description.ilike.%${searchTerm}%,products.name.ilike.%${searchTerm}%,clients.name.ilike.%${searchTerm}%`);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching time entries:", error);
          throw error;
        }
        
        console.log(`Found ${data?.length || 0} time entries`);
        
        const entriesWithUsernames = await Promise.all(
          (data || []).map(async (entry) => {
            let username = "Unknown";
            
            if (entry.user_id) {
              try {
                const { data: userData } = await supabase
                  .from("profiles")
                  .select("name")
                  .eq("id", entry.user_id)
                  .single();
                  
                if (userData && userData.name) {
                  username = userData.name;
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
        console.error("Error in time entries query:", error);
        return [];
      }
    },
    enabled: !externalTimeEntries,
  });

  const timeEntries = externalTimeEntries || fetchedTimeEntries;
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : isFetchingTimeEntries;

  useEffect(() => {
    if (!deleteDialogOpen && !invoicedWarningOpen) {
      setIsDeleting(false);
    }
  }, [deleteDialogOpen, invoicedWarningOpen]);

  const handleDeleteClick = (entry: TimeEntry) => {
    if (entry.invoiced) {
      setSelectedEntry(entry);
      setInvoicedWarningOpen(true);
    } else {
      setSelectedEntry(entry);
      setDeleteDialogOpen(true);
    }
    
    setIsDeleting(false);
  };

  const handleEditClick = (entry: TimeEntry) => {
    if (entry.invoiced) {
      toast.error("Cannot edit an invoiced time entry");
      return;
    }
    
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  const confirmDelete = async (forceDelete = false) => {
    if (!selectedEntry) return;
    
    setIsDeleting(true);
    
    try {
      const success = await deleteTimeEntry(selectedEntry.id, forceDelete);
      
      if (success) {
        if (invoicedWarningOpen) {
          setInvoicedWarningOpen(false);
        } else {
          setDeleteDialogOpen(false);
        }
        
        setSelectedEntry(null);
        onEntryDeleted();
        toast.success("Time entry deleted successfully");
      } else {
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("An unexpected error occurred");
      setIsDeleting(false);
    }
  };
  
  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    toast.success("Time entry updated successfully");
    onEntryDeleted();
  };
  
  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(2);
  };
  
  const getItemTotal = (entry: TimeEntry) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = parseFloat(calculateDuration(entry.start_time, entry.end_time));
      return (hours * (entry.products.price || 0)).toFixed(2);
    } else if (entry.products?.type === "item" && entry.quantity) {
      return (entry.quantity * (entry.products.price || 0)).toFixed(2);
    }
    return "0.00";
  };
  
  const SortableHeader = ({ field, children, className }: SortableHeaderProps) => {
    if (!onSort) return <TableHead className={className}>{children}</TableHead>;
    
    return (
      <TableHead className={`cursor-pointer ${className || ''}`} onClick={() => onSort(field)}>
        <div className="flex items-center justify-between">
          <span>{children}</span>
          {sortField === field && (
            <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
          )}
        </div>
      </TableHead>
    );
  };

  const handleItemSelect = (id: string, invoiced: boolean) => {
    if (invoiced) {
      setPendingInvoicedId(id);
      setInvoicedWarningOpen(true);
    } else {
      onItemSelect(id);
    }
  };

  const confirmInvoicedSelection = () => {
    if (pendingInvoicedId) {
      onItemSelect(pendingInvoicedId);
      setInvoicedWarningOpen(false);
      setPendingInvoicedId(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!timeEntries || timeEntries.length === 0) {
      return;
    }
    
    const hasInvoicedEntries = timeEntries.some(entry => entry.invoiced);
    
    if (checked && hasInvoicedEntries) {
      setPendingSelectAll(checked);
      setInvoicedWarningOpen(true);
      setPendingInvoicedId('all');
    } else {
      onSelectAll(checked);
    }
  };

  const confirmSelectAll = () => {
    if (pendingInvoicedId === 'all') {
      const allIds = timeEntries.map(entry => entry.id);
      
      if (pendingSelectAll) {
        allIds.forEach(id => {
          if (!selectedItems.includes(id)) {
            onItemSelect(id);
          }
        });
      }
      
      setInvoicedWarningOpen(false);
      setPendingInvoicedId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!timeEntries || timeEntries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No time entries found for the selected period.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table isCompact={isCompact}>
          <TableHeader>
            <TableRow isCompact={isCompact}>
              {bulkDeleteMode && (
                <TableHead className="w-[40px]" isCompact={isCompact}>
                  <Checkbox 
                    checked={selectedItems.length > 0 && selectedItems.length === timeEntries.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <SortableHeader field="clients.name" className={`w-[250px] max-w-[250px] truncate ${isCompact ? 'text-xs' : ''}`}>Client</SortableHeader>
              <TableHead isCompact={isCompact}>User</TableHead>
              <SortableHeader field="products.name">Product</SortableHeader>
              <TableHead isCompact={isCompact}>Type</TableHead>
              <TableHead isCompact={isCompact}>Description</TableHead>
              <SortableHeader field="start_time">Date</SortableHeader>
              <TableHead isCompact={isCompact}>Duration/Quantity</TableHead>
              <TableHead isCompact={isCompact}>Amount</TableHead>
              <TableHead isCompact={isCompact}>Status</TableHead>
              <TableHead isCompact={isCompact}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeEntries.map((entry) => (
              <TableRow key={entry.id} className={entry.invoiced ? "bg-muted/20" : ""} isCompact={isCompact} data-entry-id={entry.id}>
                {bulkDeleteMode && (
                  <TableCell isCompact={isCompact}>
                    <Checkbox 
                      checked={selectedItems.includes(entry.id)}
                      onCheckedChange={() => handleItemSelect(entry.id, !!entry.invoiced)}
                      aria-label={`Select entry ${entry.id}`}
                    />
                  </TableCell>
                )}
                <TableCell 
                  className={`w-[250px] max-w-[250px] truncate font-medium ${isCompact ? 'text-xs' : ''}`}
                  title={entry.clients?.name || "Unknown client"}
                  isCompact={isCompact}
                >
                  {entry.clients?.name || "Unknown client"}
                </TableCell>
                <TableCell isCompact={isCompact}>
                  {entry.username || "Unknown user"}
                </TableCell>
                <TableCell isCompact={isCompact}>{entry.products?.name || "Unknown product"}</TableCell>
                <TableCell isCompact={isCompact}>
                  <div className="flex items-center gap-1">
                    {entry.products?.type === "activity" ? (
                      <Clock className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-blue-500`} />
                    ) : (
                      <Package className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-primary`} />
                    )}
                    <span className="capitalize">{entry.products?.type || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px]" isCompact={isCompact}>
                  {entry.description ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-left truncate block w-full">
                          <div className="flex items-center gap-1">
                            <FileText className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-muted-foreground shrink-0`} />
                            <span className="truncate">{entry.description}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[300px] p-3">
                          <p className="font-medium mb-1">Description:</p>
                          <p className="text-sm">{entry.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground text-sm italic">No description</span>
                  )}
                </TableCell>
                <TableCell isCompact={isCompact}>
                  {entry.products?.type === "activity" && entry.start_time ? 
                    format(new Date(entry.start_time), "MMM d, yyyy") :
                    entry.created_at ? format(new Date(entry.created_at), "MMM d, yyyy") : "Unknown date"}
                </TableCell>
                <TableCell isCompact={isCompact}>
                  {entry.products?.type === "activity" && entry.start_time && entry.end_time
                    ? `${calculateDuration(entry.start_time, entry.end_time)} hours`
                    : entry.quantity ? `${entry.quantity} units` : "N/A"}
                </TableCell>
                <TableCell className="font-medium" isCompact={isCompact}>
                  {new Intl.NumberFormat('sv-SE', { 
                    style: 'currency', 
                    currency: 'SEK'
                  }).format(parseFloat(getItemTotal(entry)))}
                </TableCell>
                <TableCell isCompact={isCompact}>
                  <Badge variant={entry.invoiced ? "default" : "outline"}>
                    {entry.invoiced ? "Invoiced" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell isCompact={isCompact}>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size={isCompact ? "sm" : "default"}
                      onClick={() => handleEditClick(entry)}
                      disabled={entry.invoiced}
                      className={entry.invoiced ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(entry)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
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
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                Are you sure you want to delete this time entry? This action cannot be undone.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete(false);
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

      <AlertDialog open={invoicedWarningOpen} onOpenChange={setInvoicedWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              <span>Warning: {pendingInvoicedId === 'all' ? 'Multiple' : 'Single'} Invoiced {pendingInvoicedId === 'all' ? 'Entries' : 'Entry'}</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                <p className="mb-2">
                  You are about to {pendingInvoicedId === 'all' ? 'select' : 'delete'} {pendingInvoicedId === 'all' ? 'multiple' : 'an'} invoiced time {pendingInvoicedId === 'all' ? 'entries' : 'entry'}.
                </p>
                <p className="mb-2">
                  <strong>Important:</strong> {pendingInvoicedId === 'all' ? 'Deleting' : 'Deleting'} invoiced time entries may cause inconsistencies between your app's data and Fortnox.
                </p>
                <p>
                  If these entries have been exported to Fortnox, the deletion will only happen in your database, not in Fortnox.
                  This action cannot be reversed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingInvoicedId(null);
              setPendingSelectAll(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingInvoicedId === 'all') {
                  confirmSelectAll();
                } else {
                  confirmDelete(true);
                }
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white border-none"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "I understand, continue anyway"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DialogWrapper 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        title="Edit Time Entry"
        description="Make changes to your time entry below."
      >
        {selectedEntry && (
          <TimeEntryEditForm 
            timeEntry={selectedEntry} 
            onSuccess={handleEditSuccess} 
            onCancel={() => setEditDialogOpen(false)}
            isCompact={isCompact}
          />
        )}
      </DialogWrapper>
    </>
  );
}
