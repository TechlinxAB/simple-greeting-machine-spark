import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatTime, roundTimeToInterval } from "@/lib/formatTime";
import { Settings, Clock, Tag, Eye, Calendar, User, Briefcase, Monitor, Check, X, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { TimeEntryEditForm } from "@/components/time-tracking/TimeEntryEditForm";
import { toast } from "sonner";
import { deleteTimeEntry } from "@/lib/deleteTimeEntry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface TimeEntriesTableProps {
  userId?: string;
  clientId?: string;
  selectedYear?: number;
  selectedMonth?: number;
  onTimeEntryUpdated?: () => void;
  allTime?: boolean;
  showClientColumn?: boolean;
  showUserColumn?: boolean;
  showActions?: boolean;
  simplifiedView?: boolean;
  hideInvoiced?: boolean;
}

export function TimeEntriesTable({
  userId = null,
  clientId = null,
  selectedYear,
  selectedMonth,
  onTimeEntryUpdated,
  allTime = false,
  showClientColumn = true,
  showUserColumn = true,
  showActions = true,
  simplifiedView = false,
  hideInvoiced = false,
}: TimeEntriesTableProps) {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isInvoicedWarningOpen, setIsInvoicedWarningOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [viewingEntryDetails, setViewingEntryDetails] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const canEdit = role === 'admin' || role === 'manager';

  const startDate = startOfMonth(new Date(selectedYear, selectedMonth, 1));
  const endDate = endOfMonth(new Date(selectedYear, selectedMonth, 1));

  const queryFn = async () => {
    try {
      let query = supabase
        .from("time_entries")
        .select(`
          id, description, start_time, end_time, quantity, 
          created_at, invoiced, invoice_id, product_id, client_id, user_id
        `);

      if (!allTime) {
        query = query
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }

      if (userId) {
        query = query.eq("user_id", userId);
      }

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      if (hideInvoiced) {
        query = query.eq("invoiced", false);
      }

      query = query.order("created_at", { ascending: false });

      const { data: entries, error } = await query;

      if (error) throw error;

      const enhancedEntries = await Promise.all(
        (entries || []).map(async (entry) => {
          const clientPromise = entry.client_id
            ? supabase
                .from("clients")
                .select("id, name")
                .eq("id", entry.client_id)
                .single()
            : Promise.resolve({ data: null, error: null });

          const productPromise = entry.product_id
            ? supabase
                .from("products")
                .select("id, name, type, price")
                .eq("id", entry.product_id)
                .single()
            : Promise.resolve({ data: null, error: null });

          const userPromise = entry.user_id
            ? supabase
                .from("profiles")
                .select("id, name")
                .eq("id", entry.user_id)
                .single()
            : Promise.resolve({ data: null, error: null });

          const [
            { data: clientData },
            { data: productData },
            { data: userData }
          ] = await Promise.all([
            clientPromise,
            productPromise,
            userPromise
          ]);

          return {
            ...entry,
            client: clientData,
            product: productData,
            user: userData,
          };
        })
      );

      return enhancedEntries;
    } catch (error) {
      console.error("Error fetching time entries:", error);
      return [];
    }
  };

  const { data: timeEntries = [], isLoading, isError, refetch } = useQuery({
    queryKey: [
      "all-time-entries",
      userId,
      clientId,
      selectedYear,
      selectedMonth,
      allTime,
      hideInvoiced
    ],
    queryFn,
  });

  useEffect(() => {
    if (!isEditDialogOpen && !isInvoicedWarningOpen && !isViewDialogOpen) {
      setIsDeleteDialogOpen(false);
    }
  }, [isEditDialogOpen, isInvoicedWarningOpen, isViewDialogOpen]);

  const handleEditClick = (entry) => {
    if (entry.invoiced) {
      toast.warning(t("timeTracking.cannotEditInvoicedEntry"));
      return;
    }
    setSelectedEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (entry) => {
    if (entry.invoiced) {
      setEntryToDelete(entry);
      setIsInvoicedWarningOpen(true);
      return;
    }
    
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    
    try {
      await deleteTimeEntry(entryToDelete.id);
      
      toast.success(t("timeTracking.timeEntryDeleted"));
      queryClient.invalidateQueries({ queryKey: ["all-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      
      if (onTimeEntryUpdated) {
        onTimeEntryUpdated();
      }
    } catch (error) {
      toast.error(t("common.errorOccurred"));
    } finally {
      setIsDeleteDialogOpen(false);
      setIsInvoicedWarningOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedEntry(null);
    queryClient.invalidateQueries({ queryKey: ["all-time-entries"] });
    queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    
    if (onTimeEntryUpdated) {
      onTimeEntryUpdated();
    }
    
    toast.success(t("timeTracking.timeEntryUpdated"));
  };

  const handleViewEntry = (entry) => {
    setViewingEntryDetails(entry);
    setIsViewDialogOpen(true);
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours;
  };

  const handleDeleteInvoicedEntry = () => {
    handleDeleteConfirm();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-destructive">
        <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
        <p>{t("common.errorLoadingData")}</p>
      </div>
    );
  }

  if (timeEntries.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Monitor className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
        <p>{t("timeTracking.noTimeEntriesFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("timeTracking.timeEntries")}</CardTitle>
          <CardDescription>
            {!allTime && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>
                  {format(startDate, "MMMM yyyy")}
                </span>
              </div>
            )}
            {userId && (
              <div className="flex items-center mt-1">
                <User className="h-4 w-4 mr-1" />
                <span>{t("admin.filteredByUser")}</span>
              </div>
            )}
            {clientId && (
              <div className="flex items-center mt-1">
                <Briefcase className="h-4 w-4 mr-1" />
                <span>{t("admin.filteredByClient")}</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {showUserColumn && (
                  <TableHead>{t("common.user")}</TableHead>
                )}
                {showClientColumn && (
                  <TableHead>{t("common.client")}</TableHead>
                )}
                <TableHead>{t("common.description")}</TableHead>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead>{t("common.durationQty")}</TableHead>
                {!simplifiedView && <TableHead>{t("common.price")}</TableHead>}
                <TableHead>{t("common.date")}</TableHead>
                {!simplifiedView && <TableHead>{t("common.invoiced")}</TableHead>}
                {showActions && <TableHead className="text-right">{t("common.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  {showUserColumn && (
                    <TableCell>{entry.user?.name || t("common.unknown")}</TableCell>
                  )}
                  {showClientColumn && (
                    <TableCell>{entry.client?.name || t("common.unknown")}</TableCell>
                  )}
                  <TableCell className="max-w-[200px] truncate">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          {entry.description || entry.product?.name || t("common.noDescription")}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs whitespace-normal">
                            {entry.description || entry.product?.name || t("common.noDescription")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    {entry.product?.type === 'activity' ? (
                      <div className="flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
                        <span>{t("common.activity")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Tag className="h-3.5 w-3.5 mr-1 text-primary" />
                        <span>{t("common.item")}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.product?.type === 'activity' && entry.start_time && entry.end_time ? (
                      formatTime(calculateDuration(entry.start_time, entry.end_time), simplifiedView)
                    ) : (
                      entry.quantity ? entry.quantity.toString() : '0'
                    )}
                  </TableCell>
                  {!simplifiedView && (
                    <TableCell>
                      {entry.product?.type === 'activity' && entry.start_time && entry.end_time ? (
                        formatCurrency(calculateDuration(entry.start_time, entry.end_time) * (entry.product?.price || 0))
                      ) : (
                        entry.quantity ? formatCurrency(entry.quantity * (entry.product?.price || 0)) : formatCurrency(0)
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {entry.created_at ? format(new Date(entry.created_at), "yyyy-MM-dd") : '-'}
                  </TableCell>
                  {!simplifiedView && (
                    <TableCell>
                      {entry.invoiced ? (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-xs text-green-700 dark:text-green-400">{t("common.yes")}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <X className="h-4 w-4 text-red-500 mr-1" />
                          <span className="text-xs text-red-700 dark:text-red-400">{t("common.no")}</span>
                        </div>
                      )}
                    </TableCell>
                  )}
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewEntry(entry)}
                          className="h-7 w-7"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(entry)}
                              className={`h-7 w-7 ${entry.invoiced ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={entry.invoiced}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(entry)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("timeTracking.editTimeEntry")}</DialogTitle>
            <DialogDescription>{t("timeTracking.editTimeEntryDesc")}</DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <TimeEntryEditForm
              timeEntry={selectedEntry}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("timeTracking.timeEntryDetails")}</DialogTitle>
          </DialogHeader>
          
          {viewingEntryDetails && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">{t("common.description")}</h4>
                <p className="text-sm text-muted-foreground">
                  {viewingEntryDetails.description || viewingEntryDetails.product?.name || t("common.noDescription")}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("common.type")}</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {viewingEntryDetails.product?.type || t("common.unknown")}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("common.client")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {viewingEntryDetails.client?.name || t("common.unknown")}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("common.user")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {viewingEntryDetails.user?.name || t("common.unknown")}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("common.date")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {viewingEntryDetails.created_at ? format(new Date(viewingEntryDetails.created_at), "yyyy-MM-dd") : '-'}
                  </p>
                </div>
                
                {viewingEntryDetails.product?.type === 'activity' ? (
                  <>
                    <div>
                      <h4 className="text-sm font-medium mb-1">{t("timeTracking.startTime")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {viewingEntryDetails.start_time 
                          ? format(new Date(viewingEntryDetails.start_time), "HH:mm") 
                          : '-'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">{t("timeTracking.endTime")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {viewingEntryDetails.end_time 
                          ? format(new Date(viewingEntryDetails.end_time), "HH:mm") 
                          : '-'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">{t("common.duration")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {viewingEntryDetails.start_time && viewingEntryDetails.end_time
                          ? formatTime(calculateDuration(viewingEntryDetails.start_time, viewingEntryDetails.end_time))
                          : '-'
                        }
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <h4 className="text-sm font-medium mb-1">{t("common.quantity")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {viewingEntryDetails.quantity || '0'}
                    </p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("common.price")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(viewingEntryDetails.product?.price || 0)}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("common.total")}</h4>
                  <p className="text-sm font-medium">
                    {viewingEntryDetails.product?.type === 'activity'
                      ? formatCurrency(
                          calculateDuration(
                            viewingEntryDetails.start_time,
                            viewingEntryDetails.end_time
                          ) * (viewingEntryDetails.product?.price || 0)
                        )
                      : formatCurrency(
                          (viewingEntryDetails.quantity || 0) * (viewingEntryDetails.product?.price || 0)
                        )
                    }
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">{t("common.status")}</h4>
                <div className="flex items-center">
                  {viewingEntryDetails.invoiced ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <p className="text-sm text-muted-foreground">{t("common.invoiced")}</p>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-orange-500 mr-2"></div>
                      <p className="text-sm text-muted-foreground">{t("common.notInvoiced")}</p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewDialogOpen(false)}
                  className="w-full"
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("timeTracking.deleteTimeEntry")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("timeTracking.deleteTimeEntryConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isInvoicedWarningOpen} onOpenChange={setIsInvoicedWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invoices.invoicedWarningTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">{t("invoices.invoicedWarningDesc1")}</p>
              <p className="font-semibold text-destructive">{t("invoices.invoicedWarningDesc2")}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteInvoicedEntry}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("invoices.deleteAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
