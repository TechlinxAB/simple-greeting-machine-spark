
import { format, formatDistanceToNow } from "date-fns";
import { CalendarClock, Clock, Loader2, Package, Trash2, ArrowUpDown, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TimeEntryEditForm } from "@/components/time-tracking/TimeEntryEditForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { TimeEntry } from "@/types";

interface TimeEntriesTableProps {
  timeEntries: TimeEntry[];
  isLoading: boolean;
  onEntryDeleted: () => void;
  bulkDeleteMode?: boolean;
  selectedItems?: string[];
  onItemSelect?: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
  onSort?: (field: string) => void;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc';
}

export function TimeEntriesTable({ 
  timeEntries, 
  isLoading, 
  onEntryDeleted,
  bulkDeleteMode = false,
  selectedItems = [],
  onItemSelect = () => {},
  onSelectAll = () => {},
  onSort,
  sortField,
  sortDirection = 'asc'
}: TimeEntriesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (entry: TimeEntry) => {
    if (entry.invoiced) {
      toast.error("Cannot delete an invoiced time entry");
      return;
    }
    
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (entry: TimeEntry) => {
    if (entry.invoiced) {
      toast.error("Cannot edit an invoiced time entry");
      return;
    }
    
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEntry) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", selectedEntry.id);
      
      if (error) {
        console.error("Error deleting time entry:", error);
        toast.error("Failed to delete time entry");
        return;
      }
      
      setDeleteDialogOpen(false);
      onEntryDeleted();
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    toast.success("Time entry updated successfully");
    onEntryDeleted(); // Refresh the list
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
  
  const SortableHeader = ({ field, children }: { field: string, children: React.ReactNode }) => {
    if (!onSort) return <TableHead>{children}</TableHead>;
    
    return (
      <TableHead className="cursor-pointer" onClick={() => onSort(field)}>
        <div className="flex items-center justify-between">
          <span>{children}</span>
          {sortField === field && (
            <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
          )}
        </div>
      </TableHead>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (timeEntries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No time entries found for the selected period.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {bulkDeleteMode && (
                <TableHead className="w-[40px]">
                  <Checkbox 
                    checked={timeEntries.length > 0 && selectedItems.length === timeEntries.length}
                    onCheckedChange={onSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <SortableHeader field="clients.name">Client</SortableHeader>
              <TableHead>User</TableHead>
              <SortableHeader field="products.name">Product</SortableHeader>
              <TableHead>Type</TableHead>
              <SortableHeader field="start_time">Date</SortableHeader>
              <TableHead>Duration/Quantity</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeEntries.map((entry) => (
              <TableRow key={entry.id}>
                {bulkDeleteMode && (
                  <TableCell>
                    <Checkbox 
                      checked={selectedItems.includes(entry.id)}
                      onCheckedChange={() => onItemSelect(entry.id)}
                      disabled={entry.invoiced}
                      aria-label={`Select entry ${entry.id}`}
                    />
                  </TableCell>
                )}
                <TableCell>{entry.clients?.name || "Unknown client"}</TableCell>
                <TableCell>
                  {entry.profiles?.name || "Unknown user"}
                </TableCell>
                <TableCell>{entry.products?.name || "Unknown product"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {entry.products?.type === "activity" ? (
                      <Clock className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Package className="h-4 w-4 text-primary" />
                    )}
                    <span className="capitalize">{entry.products?.type || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {entry.start_time && format(new Date(entry.start_time), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {entry.products?.type === "activity" && entry.start_time && entry.end_time
                    ? `${calculateDuration(entry.start_time, entry.end_time)} hours`
                    : entry.quantity ? `${entry.quantity} units` : "N/A"}
                </TableCell>
                <TableCell className="font-medium">
                  {new Intl.NumberFormat('sv-SE', { 
                    style: 'currency', 
                    currency: 'SEK'
                  }).format(parseFloat(getItemTotal(entry)))}
                </TableCell>
                <TableCell>
                  <Badge variant={entry.invoiced ? "default" : "outline"}>
                    {entry.invoiced ? "Invoiced" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
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
                      disabled={entry.invoiced}
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
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Make changes to your time entry below.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <TimeEntryEditForm 
              timeEntry={selectedEntry} 
              onSuccess={handleEditSuccess} 
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
