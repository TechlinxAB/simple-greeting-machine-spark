
import { useState } from "react";
import { format } from "date-fns";
import { Trash2, Info, Clock, AlertCircle, User } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { type TimeEntry } from "@/types";
import { deleteTimeEntry } from "@/lib/deleteTimeEntry";

interface TimeEntriesTableProps {
  timeEntries: TimeEntry[];
  isLoading: boolean;
  onEntryDeleted: () => void;
}

export function TimeEntriesTable({ timeEntries, isLoading, onEntryDeleted }: TimeEntriesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format duration from start/end times
  const formatDuration = (entry: TimeEntry) => {
    if (!entry.start_time || !entry.end_time) {
      return "N/A";
    }
    
    const start = new Date(entry.start_time);
    const end = new Date(entry.end_time);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / 1000 / 60 / 60);
    const diffMinutes = Math.floor((diffMs / 1000 / 60) % 60);
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const handleDeleteClick = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    
    setIsDeleting(true);
    
    try {
      const success = await deleteTimeEntry(selectedEntry.id);
      
      if (success) {
        onEntryDeleted();
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
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
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No time entries found</h3>
        <p className="text-muted-foreground mt-1">
          No time entries match your current filters.
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
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Product/Activity</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="font-medium">
                    {entry.start_time ? format(new Date(entry.start_time), "MMM d, yyyy") : "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.start_time && format(new Date(entry.start_time), "h:mm a")} 
                    {entry.end_time && ` - ${format(new Date(entry.end_time), "h:mm a")}`}
                  </div>
                </TableCell>
                <TableCell>
                  {entry.clients?.name || "Unknown client"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {entry.products?.name || (
                      <span className="text-amber-600 font-medium">Deleted product</span>
                    )}
                    {entry.invoiced && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="ml-2">
                              <Info className="h-4 w-4 text-blue-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This entry has been invoiced</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.products ? (
                      <>
                        {entry.products.type === "activity" ? "Activity" : "Item"}
                        {entry.products.price && ` - ${new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD'
                        }).format(entry.products.price)}`}
                      </>
                    ) : (
                      "Unknown type"
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDuration(entry)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {entry.description || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{entry.profiles?.name || "Unknown user"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(entry)}
                      disabled={entry.invoiced || !!entry.invoice_id}
                      className={
                        entry.invoiced || !!entry.invoice_id
                          ? "text-muted-foreground cursor-not-allowed"
                          : "text-destructive hover:text-destructive hover:bg-destructive/10"
                      }
                      title={
                        entry.invoiced || !!entry.invoice_id
                          ? "Cannot delete invoiced entries"
                          : "Delete time entry"
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
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry? This action is irreversible 
              and will permanently remove the entry from the system.
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
