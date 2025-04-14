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
  ClipboardList, 
  Edit, 
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimeEntryEditForm } from "./TimeEntryEditForm";
import { toast } from "sonner";
import { TimeEntry } from "@/types";
import { deleteTimeEntry } from "@/lib/deleteTimeEntry";
import { formatCurrency } from "@/lib/formatCurrency";

interface TimeEntriesListProps {
  selectedDate: Date;
  formattedDate: string;
}

export function TimeEntriesList({ selectedDate, formattedDate }: TimeEntriesListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(selectedDate);
  
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
            user_id,
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
    enabled: !!user,
  });

  useEffect(() => {
    if (!deleteDialogOpen) {
      setIsDeleting(false);
    }
  }, [deleteDialogOpen]);

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours;
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${hours.toFixed(2)} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  const getItemAmount = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = calculateDuration(entry.start_time, entry.end_time);
      return formatDuration(hours);
    } else if (entry.products?.type === "item" && entry.quantity) {
      return `${entry.quantity} units`;
    }
    return "-";
  };

  const getItemTotal = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = calculateDuration(entry.start_time, entry.end_time);
      return formatCurrency(hours * entry.products.price);
    } else if (entry.products?.type === "item" && entry.quantity) {
      return formatCurrency(entry.quantity * entry.products.price);
    }
    return "-";
  };

  const handleDeleteClick = (entry: any) => {
    console.log("Delete clicked for entry:", entry);
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
    setIsDeleting(false);
  };
  
  const confirmDelete = async () => {
    if (!selectedEntry || !selectedEntry.id) {
      toast.error("No time entry selected for deletion");
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const success = await deleteTimeEntry(selectedEntry.id);
      
      if (success) {
        setDeleteDialogOpen(false);
        setSelectedEntry(null);
        
        queryClient.setQueryData(queryKey, (oldData: any[] = []) => {
          return oldData.filter(item => item.id !== selectedEntry.id);
        });
        
        await queryClient.invalidateQueries({ 
          queryKey: ["time-entries"]
        });
        
        await refetch();
        toast.success("Time entry deleted successfully");
      } else {
        setIsDeleting(false);
      }
    } catch (error: any) {
      setIsDeleting(false);
      console.error("Delete time entry error:", error);
      toast.error(error.message || "Failed to delete time entry");
    }
  };
  
  const handleEditClick = (entry: any) => {
    console.log("Edit clicked for entry:", entry);
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };
  
  const handleEditSuccess = async () => {
    console.log("Edit successful, refreshing data");
    setEditDialogOpen(false);
    setSelectedEntry(null);
    
    await queryClient.invalidateQueries({ 
      queryKey: ["time-entries"]
    });
    
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Client</TableHead>
                    <TableHead className="w-[250px]">Description</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[120px]">Amount</TableHead>
                    <TableHead className="w-[100px]">Total</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {entry.clients?.name || 'Unknown client'}
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <div className="line-clamp-2">
                          {entry.description || 
                            (entry.products?.name || 'No description')}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {entry.products ? (
                            entry.products.type === 'activity' ? (
                              <Clock className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Package className="h-4 w-4 text-primary" />
                            )
                          ) : (
                            <Package className="h-4 w-4 text-amber-600" />
                          )}
                          <span className="capitalize">
                            {entry.products?.type || 'Deleted product'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{getItemAmount(entry)}</TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">
                        {getItemTotal(entry)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={entry.invoiced ? "default" : "outline"}>
                          {entry.invoiced ? "Invoiced" : "Pending"}
                        </Badge>
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
            </div>
          )}
        </CardContent>
      </Card>
      
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
