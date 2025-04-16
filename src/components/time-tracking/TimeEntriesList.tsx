
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
  Loader2,
  AlertCircle
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
import { useIsLaptop } from "@/hooks/use-mobile";

interface TimeEntriesListProps {
  selectedDate: Date;
  formattedDate: string;
  isCompact?: boolean;
}

export function TimeEntriesList({ selectedDate, formattedDate, isCompact }: TimeEntriesListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autoIsLaptop = useIsLaptop();
  
  // Use explicit prop if provided, otherwise use the hook
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoicedWarningOpen, setInvoicedWarningOpen] = useState(false);
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
    if (!deleteDialogOpen && !invoicedWarningOpen) {
      setIsDeleting(false);
    }
  }, [deleteDialogOpen, invoicedWarningOpen]);

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
    
    if (entry.invoiced) {
      setInvoicedWarningOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
    
    setIsDeleting(false);
  };
  
  const confirmDelete = async (forceDelete = false) => {
    if (!selectedEntry || !selectedEntry.id) {
      toast.error("No time entry selected for deletion");
      return;
    }
    
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
        
        queryClient.setQueryData(queryKey, (oldData: any[] = []) => {
          return oldData.filter(item => item.id !== selectedEntry.id);
        });
        
        await queryClient.invalidateQueries({ 
          queryKey: ["time-entries"]
        });
        
        await refetch();
        toast.success("Time entry deleted successfully");
      } else {
        if (!forceDelete && selectedEntry.invoiced) {
          setInvoicedWarningOpen(true);
          setDeleteDialogOpen(false);
        } else {
          setIsDeleting(false);
        }
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
        <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'pb-1 pt-3' : 'pb-2 pt-4'}`}>
          <CardTitle className={`${compact ? 'text-sm' : 'text-base'} font-medium`}>
            Activities for <span className="text-primary">{formattedDate}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : timeEntries.length === 0 ? (
            <div className={`text-center ${compact ? 'py-8' : 'py-12'} text-muted-foreground`}>
              <ClipboardList className={`mx-auto ${compact ? 'h-10 w-10 mb-3' : 'h-12 w-12 mb-4'} text-muted-foreground/60`} />
              <p>No activities recorded for this day.</p>
              <p className={`${compact ? 'text-xs' : 'text-sm'} mt-2`}>Click "Save time entry" to add your first activity.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table isCompact={compact}>
                <TableHeader>
                  <TableRow isCompact={compact}>
                    <TableHead className={compact ? "w-[140px]" : "w-[180px]"} isCompact={compact}>Client</TableHead>
                    <TableHead className={compact ? "w-[180px]" : "w-[250px]"} isCompact={compact}>Description</TableHead>
                    <TableHead className={compact ? "w-[80px]" : "w-[100px]"} isCompact={compact}>Type</TableHead>
                    <TableHead className={compact ? "w-[100px]" : "w-[120px]"} isCompact={compact}>Amount</TableHead>
                    <TableHead className={compact ? "w-[80px]" : "w-[100px]"} isCompact={compact}>Total</TableHead>
                    <TableHead className={compact ? "w-[80px]" : "w-[100px]"} isCompact={compact}>Status</TableHead>
                    <TableHead className={compact ? "w-[90px]" : "w-[120px]"} isCompact={compact}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id} isCompact={compact}>
                      <TableCell className="font-medium whitespace-nowrap" isCompact={compact}>
                        {entry.clients?.name || 'Unknown client'}
                      </TableCell>
                      <TableCell className={compact ? "max-w-[180px]" : "max-w-[250px]"} isCompact={compact}>
                        <div className="line-clamp-2">
                          {entry.description || 
                            (entry.products?.name || 'No description')}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap" isCompact={compact}>
                        <div className="flex items-center gap-1">
                          {entry.products ? (
                            entry.products.type === 'activity' ? (
                              <Clock className={compact ? "h-3 w-3 text-blue-500" : "h-4 w-4 text-blue-500"} />
                            ) : (
                              <Package className={compact ? "h-3 w-3 text-primary" : "h-4 w-4 text-primary"} />
                            )
                          ) : (
                            <Package className={compact ? "h-3 w-3 text-amber-600" : "h-4 w-4 text-amber-600"} />
                          )}
                          <span className="capitalize">
                            {entry.products?.type || 'Deleted product'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap" isCompact={compact}>{getItemAmount(entry)}</TableCell>
                      <TableCell className="font-semibold whitespace-nowrap" isCompact={compact}>
                        {getItemTotal(entry)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" isCompact={compact}>
                        <Badge variant={entry.invoiced ? "default" : "outline"} className={compact ? "text-xs py-0.5" : ""}>
                          {entry.invoiced ? "Invoiced" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell isCompact={compact}>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={compact ? "h-6 w-6" : "h-8 w-8"} 
                            onClick={() => handleEditClick(entry)}
                            disabled={entry.invoiced}
                          >
                            <Edit className={compact ? "h-3 w-3" : "h-4 w-4"} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={compact 
                              ? "h-6 w-6 text-destructive hover:text-destructive/90 hover:bg-destructive/10" 
                              : "h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            } 
                            onClick={() => handleDeleteClick(entry)}
                            disabled={entry.invoiced}
                          >
                            <Trash className={compact ? "h-3 w-3" : "h-4 w-4"} />
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
                confirmDelete(false);
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
      
      <AlertDialog open={invoicedWarningOpen} onOpenChange={setInvoicedWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              <span>Warning: Invoiced Time Entry</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                You are about to delete an invoiced time entry. This may cause inconsistencies between your app's data and Fortnox.
              </p>
              <p>
                If this entry has been exported to Fortnox, the deletion will only happen in your database, not in Fortnox.
                This action cannot be reversed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Anyway"
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
              isCompact={compact}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
