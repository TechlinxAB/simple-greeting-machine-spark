
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfDay, endOfDay, formatDistanceToNow, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Clock, 
  Package, 
  CalendarClock, 
  ClipboardList, 
  Eye, 
  Edit, 
  Plus, 
  Trash,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimeEntryEditForm } from "./TimeEntryEditForm";
import { toast } from "sonner";
import { TimeEntry } from "@/types";

interface TimeEntriesListProps {
  selectedDate: Date;
  formattedDate: string;
}

export function TimeEntriesList({ selectedDate, formattedDate }: TimeEntriesListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State for dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(selectedDate);
  
  // Create a unique query key for this date
  const queryKey = ["time-entries", format(selectedDate, "yyyy-MM-dd")];

  const { data: timeEntries = [], isLoading, refetch } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!user) return [];

      try {
        console.log(`Fetching time entries for ${format(selectedDate, "yyyy-MM-dd")}`);
        const { data, error } = await supabase
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
            products:product_id (id, name, type, price),
            clients:client_id (id, name)
          `)
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }
        
        console.log(`Found ${data?.length || 0} time entries`);
        return data || [];
      } catch (error) {
        console.error("Error fetching time entries:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(2);
  };

  const getItemAmount = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = parseFloat(calculateDuration(entry.start_time, entry.end_time));
      return `${hours} hours × ${entry.products.price} SEK`;
    } else if (entry.products?.type === "item" && entry.quantity) {
      return `${entry.quantity} × ${entry.products.price} SEK`;
    }
    return "-";
  };

  const getItemTotal = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = parseFloat(calculateDuration(entry.start_time, entry.end_time));
      return (hours * entry.products.price).toFixed(2);
    } else if (entry.products?.type === "item" && entry.quantity) {
      return (entry.quantity * entry.products.price).toFixed(2);
    }
    return "-";
  };
  
  // Handle delete time entry
  const handleDeleteClick = (entry: any) => {
    console.log("Delete clicked for entry:", entry);
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!selectedEntry || !selectedEntry.id) {
      toast.error("No time entry selected for deletion");
      return;
    }
    
    setIsDeleting(true);
    
    try {
      console.log("Deleting time entry with ID:", selectedEntry.id);
      
      // First verify the entry exists
      const { data: checkData, error: checkError } = await supabase
        .from("time_entries")
        .select("id")
        .eq("id", selectedEntry.id)
        .single();
        
      if (checkError) {
        console.error("Error checking time entry:", checkError);
        throw new Error("Could not find the time entry in the database");
      }
      
      // Now perform the delete operation
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", selectedEntry.id);
        
      if (error) {
        console.error("Error deleting time entry:", error);
        throw error;
      }
      
      // Update UI first
      toast.success("Time entry deleted successfully");
      
      // Then invalidate queries and refetch
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      
      // Force immediate refetch
      await refetch();
      
      // Close the dialog
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Delete time entry error:", error);
      toast.error(error.message || "Failed to delete time entry");
    } finally {
      setIsDeleting(false);
      setSelectedEntry(null);
    }
  };
  
  // Handle edit time entry
  const handleEditClick = (entry: any) => {
    console.log("Edit clicked for entry:", entry);
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };
  
  // Handle edit success
  const handleEditSuccess = async () => {
    console.log("Edit successful, refreshing data");
    setEditDialogOpen(false);
    setSelectedEntry(null);
    
    // Invalidate all time entries queries
    await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    
    // Force immediate refetch of this specific date's entries
    await refetch();
    
    toast.success("Time entry updated successfully");
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
          <CardTitle className="text-base font-medium">
            Activities for <span className="text-primary">{formattedDate}</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>View full list</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 mb-4 text-muted-foreground/60" />
              <p>No activities recorded for this day.</p>
              <p className="text-sm mt-2">Click "Save time entry" to add your first activity.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client / Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.clients?.name || 'Unknown client'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {entry.description || 
                        (entry.products?.name || 'No description')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {entry.products?.type === 'activity' ? (
                          <Clock className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Package className="h-4 w-4 text-primary" />
                        )}
                        <span className="capitalize">{entry.products?.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getItemAmount(entry)}</TableCell>
                    <TableCell className="font-semibold">
                      {getItemTotal(entry)} SEK
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.invoiced ? "default" : "outline"}>
                        {entry.invoiced ? "Invoiced" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleEditClick(entry)}
                          disabled={entry.invoiced}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10" 
                          onClick={() => handleDeleteClick(entry)}
                          disabled={entry.invoiced}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <div className="p-2 flex justify-end border-t">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Delete confirmation dialog */}
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
                e.preventDefault(); // Prevent form submission
                confirmDelete();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
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
      
      {/* Edit dialog */}
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
