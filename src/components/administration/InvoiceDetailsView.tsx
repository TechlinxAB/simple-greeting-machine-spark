import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Invoice, TimeEntry } from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Package, Loader2, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface InvoiceDetailsViewProps {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
}

export function InvoiceDetailsView({ invoice, open, onClose }: InvoiceDetailsViewProps) {
  const [timeEntries, setTimeEntries] = React.useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        const { data, error } = await supabase
          .from('time_entries')
          .select(`
            id,
            client_id,
            product_id,
            user_id,
            start_time,
            end_time,
            description,
            quantity,
            invoice_id,
            created_at,
            updated_at,
            products (id, name, type, price)
          `)
          .eq('invoice_id', invoice.id);

        if (error) {
          console.error('Error fetching time entries:', error);
          return;
        }

        if (data && data.length > 0) {
          const userIds = data.map(entry => entry.user_id);
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', userIds);
            
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          }
          
          const userNamesMap: Record<string, string> = {};
          profilesData?.forEach(profile => {
            if (profile.id) {
              userNamesMap[profile.id] = profile.name || 'Unknown';
            }
          });
          
          const typedEntries: TimeEntry[] = data.map(entry => ({
            ...entry,
            products: entry.products ? {
              ...entry.products,
              type: entry.products.type as 'activity' | 'item'
            } : undefined,
            profiles: {
              name: userNamesMap[entry.user_id] || 'Unknown'
            }
          }));
          
          setTimeEntries(typedEntries);
        } else {
          setTimeEntries([]);
        }
      } catch (error) {
        console.error('Error in fetchTimeEntries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && invoice.id) {
      fetchTimeEntries();
    }
  }, [invoice.id, open]);

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(2);
  };
  
  const getItemTotal = (entry: TimeEntry) => {
    if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
      const hours = parseFloat(calculateDuration(entry.start_time, entry.end_time));
      return (hours * (entry.products.price || 0)).toFixed(2);
    } else if (entry.products?.type === 'item' && entry.quantity) {
      return (entry.quantity * (entry.products.price || 0)).toFixed(2);
    }
    return '0.00';
  };

  const copyToClipboard = async (text: string, entryId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(entryId);
      toast.success("Description copied to clipboard");
      
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  const activityCount = timeEntries.filter(entry => entry.products?.type === 'activity').length;
  const itemCount = timeEntries.filter(entry => entry.products?.type === 'item').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-xl font-semibold">Invoice Details</DialogTitle>
          <DialogDescription>
            View details of this invoice and related time entries.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Invoice Information</CardTitle>
                <CardDescription>Details about this invoice</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                  <div className="font-medium text-muted-foreground">Invoice Number:</div>
                  <div>{invoice.invoice_number}</div>
                  
                  <div className="font-medium text-muted-foreground">Fortnox Invoice ID:</div>
                  <div>{invoice.fortnox_invoice_id || 'N/A'}</div>
                  
                  <div className="font-medium text-muted-foreground">Client:</div>
                  <div>{invoice.clients?.name}</div>
                  
                  <div className="font-medium text-muted-foreground">Issue Date:</div>
                  <div>{invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : 'N/A'}</div>
                  
                  <div className="font-medium text-muted-foreground">Due Date:</div>
                  <div>{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}</div>
                  
                  <div className="font-medium text-muted-foreground">Status:</div>
                  <div>
                    <Badge variant="outline" className={`${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                      {invoice.status || 'draft'}
                    </Badge>
                  </div>
                  
                  <div className="font-medium text-muted-foreground">Total Amount:</div>
                  <div className="font-bold">
                    {new Intl.NumberFormat('sv-SE', { 
                      style: 'currency', 
                      currency: 'SEK'
                    }).format(invoice.total_amount || 0)}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Summary</CardTitle>
                <CardDescription>Invoice line items summary</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                      <span className="text-muted-foreground">Time entries:</span>
                      <span className="text-right">{timeEntries.length}</span>
                      
                      <span className="text-muted-foreground">Activities:</span>
                      <span className="text-right">{activityCount}</span>
                      
                      <span className="text-muted-foreground">Items:</span>
                      <span className="text-right">{itemCount}</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                      <span className="font-medium">Total:</span>
                      <span className="text-right font-bold">
                        {new Intl.NumberFormat('sv-SE', { 
                          style: 'currency', 
                          currency: 'SEK'
                        }).format(invoice.total_amount || 0)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card className="border shadow-sm mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Time Entries</CardTitle>
              </div>
              <CardDescription>Time entries and items included in this invoice</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : timeEntries.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground px-6">
                  No time entries found for this invoice.
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Duration/Quantity</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.products?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {entry.products?.type === 'activity' ? (
                                <Clock className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Package className="h-4 w-4 text-primary" />
                              )}
                              <span className="text-xs capitalize">{entry.products?.type || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{entry.profiles?.name || 'Unknown'}</TableCell>
                          <TableCell className="max-w-[150px]">
                            {entry.description ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="truncate cursor-pointer text-blue-600 hover:text-blue-800 transition-colors hover:underline">
                                    {entry.description}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" side="top" align="start">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-sm">Description</h4>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => copyToClipboard(entry.description || '', entry.id)}
                                      >
                                        {copiedId === entry.id ? (
                                          <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <Copy className="h-4 w-4" />
                                        )}
                                        <span className="ml-1">{copiedId === entry.id ? "Copied" : "Copy"}</span>
                                      </Button>
                                    </div>
                                    <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                      {entry.description}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">No description</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {entry.products?.type === 'activity' && entry.start_time ? 
                              format(new Date(entry.start_time), 'MMM d, yyyy') :
                              entry.created_at ? format(new Date(entry.created_at), 'MMM d, yyyy') : 'Unknown date'}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {entry.products?.type === 'activity' && entry.start_time && entry.end_time
                              ? `${calculateDuration(entry.start_time, entry.end_time)} hours`
                              : entry.quantity ? `${entry.quantity} units` : 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium text-right whitespace-nowrap">
                            {new Intl.NumberFormat('sv-SE', { 
                              style: 'currency', 
                              currency: 'SEK'
                            }).format(parseFloat(getItemTotal(entry)))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
