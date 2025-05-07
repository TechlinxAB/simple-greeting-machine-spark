import React, { useState, useEffect } from "react";
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { formatTime } from "@/lib/formatTime";

interface TimeEntriesListProps {
  selectedDate: Date;
  formattedDate: string;
  isCompact?: boolean;
}

export function TimeEntriesList({ selectedDate, formattedDate, isCompact }: TimeEntriesListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autoIsLaptop = useIsLaptop();
  const { t } = useTranslation();
  
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoicedWarningOpen, setInvoicedWarningOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(selectedDate);
  
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const queryKey = ["time-entries", dateString];

  useEffect(() => {
    if (user) {
      console.log(`Selected date changed to ${dateString}, refreshing time entries`);
      queryClient.invalidateQueries({ queryKey: queryKey });
    }
  }, [dateString, user, queryClient]);

  const { data: timeEntries = [], isLoading, refetch } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!user) return [];

      try {
        console.log(`Fetching time entries for ${format(selectedDate, "yyyy-MM-dd")}`);
        
        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();
        
        console.log(`Date range: ${startIso} to ${endIso}`);
        
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
            custom_price,
            products:product_id (id, name, type, price),
            clients:client_id (id, name)
          `)
          .eq("user_id", user.id)
          .gte("created_at", startIso)
          .lte("created_at", endIso)
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
    refetchOnMount: true,
    staleTime: 0
  });

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours;
  };

  const formatDuration = (hours: number) => {
    return formatTime(hours, compact);
  };

  const getItemAmount = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      // If we have a rounded_duration_minutes value, use it for display/billing
      if (entry.rounded_duration_minutes) {
        const hours = entry.rounded_duration_minutes / 60;
        return formatDuration(hours);
      } else {
        // Fallback to calculated duration if rounded_duration_minutes is not available
        const hours = calculateDuration(entry.start_time, entry.end_time);
        // Apply rounding rules for display
        const minutes = hours * 60;
        const roundedMinutes = roundDurationMinutes(minutes);
        const roundedHours = roundedMinutes / 60;
        return formatDuration(roundedHours);
      }
    } else if (entry.products?.type === "item" && entry.quantity) {
      return `${entry.quantity} ${t('timeTracking.units')}`;
    }
    return "-";
  };

  const getItemTotal = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      let hours;
      
      // If we have a rounded_duration_minutes value, use it for billing
      if (entry.rounded_duration_minutes) {
        hours = entry.rounded_duration_minutes / 60;
      } else {
        // Fallback to calculated and rounded duration if rounded_duration_minutes is not available
        const calculatedHours = calculateDuration(entry.start_time, entry.end_time);
        const minutes = calculatedHours * 60;
        const roundedMinutes = roundDurationMinutes(minutes);
        hours = roundedMinutes / 60;
      }
      
      // Use custom price if available, otherwise use product price
      const price = entry.custom_price !== null ? entry.custom_price : entry.products.price;
      return formatCurrency(hours * price);
    } else if (entry.products?.type === "item" && entry.quantity) {
      // Use custom price if available, otherwise use product price
      const price = entry.custom_price !== null ? entry.custom_price : entry.products.price;
      return formatCurrency(entry.quantity * price);
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
      toast.error(t("error.somethingWentWrong"));
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
        toast.success(t("timeTracking.timeEntryDeleted"));
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
      toast.error(error.message || t("error.somethingWentWrong"));
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
    
    toast.success(t("timeTracking.timeEntryUpdated"));
  };

  return (
    <>
      <Card>
        <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'pb-1 pt-3' : 'pb-2 pt-4'}`}>
          <CardTitle className={`${compact ? 'text-sm' : 'text-base'} font-medium`}>
            {t("timeTracking.activitiesFor")} <span className="text-primary">{formattedDate}</span>
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
              <p>{t("timeTracking.noTimeEntries")} {formattedDate}.</p>
              <p className={`${compact ? 'text-xs' : 'text-sm'} mt-2`}>{t("timeTracking.noTimeEntriesDesc")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table isCompact={compact}>
                <TableHeader>
                  <TableRow isCompact={compact}>
                    <TableHead className={compact ? "w-[140px]" : "w-[180px]"} isCompact={compact}>{t("clients.client")}</TableHead>
                    <TableHead className={compact ? "w-[180px]" : "w-[250px]"} isCompact={compact}>{t("timeTracking.description")}</TableHead>
                    <TableHead className={compact ? "w-[80px]" : "w-[100px]"} isCompact={compact}>{t("products.productType")}</TableHead>
                    <TableHead className={compact ? "w-[100px]" : "w-[120px]"} isCompact={compact}>{t("invoices.amount")}</TableHead>
                    <TableHead className={compact ? "w-[80px]" : "w-[100px]"} isCompact={compact}>{t("invoices.total")}</TableHead>
                    <TableHead className={compact ? "w-[90px]" : "w-[120px]"} isCompact={compact}>{t("administration.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id} isCompact={compact}>
                      <TableCell className="font-medium whitespace-nowrap" isCompact={compact}>
                        {entry.clients?.name || t("clients.unknownClient")}
                      </TableCell>
                      <TableCell className={compact ? "max-w-[180px]" : "max-w-[250px]"} isCompact={compact}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div 
                              data-description-toggle 
                              className="line-clamp-2 cursor-pointer"
                            >
                              {entry.description || 
                                (entry.products?.name || t("timeTracking.noDescription"))}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="max-w-[300px] p-4 text-wrap break-words">
                            <p>{entry.description || (entry.products?.name || t("timeTracking.noDescription"))}</p>
                          </PopoverContent>
                        </Popover>
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
                            {entry.products?.type === 'activity' 
                              ? t("products.activity") 
                              : entry.products?.type === 'item' 
                                ? t("products.item") 
                                : t("products.deletedProduct")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap" isCompact={compact}>{getItemAmount(entry)}</TableCell>
                      <TableCell className="font-semibold whitespace-nowrap" isCompact={compact}>
                        {getItemTotal(entry)}
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
            <AlertDialogTitle>{t("timeTracking.deleteTimeEntry")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("timeTracking.deleteConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
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
                  {t("common.deleting")}...
                </>
              ) : (
                t("common.delete")
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
              <span>{t("invoices.invoicedWarningTitle")}</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                {t("invoices.invoicedWarningDesc1")}
              </p>
              <p>
                {t("invoices.invoicedWarningDesc2")}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
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
                  {t("common.deleting")}...
                </>
              ) : (
                t("invoices.deleteAnyway")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{t("timeTracking.editTimeEntry")}</DialogTitle>
            <DialogDescription>
              {t("timeTracking.editTimeEntryDesc")}
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
