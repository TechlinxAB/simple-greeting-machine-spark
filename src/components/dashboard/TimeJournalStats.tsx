
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar,
  Clock,
  DollarSign,
  FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/formatCurrency";

interface TimeJournalStatsProps {
  userId?: string;
  selectedYear: number;
  selectedMonth: number;
  selectedClient: string | null;
  showUserColumn?: boolean;
  simplifiedView?: boolean;
}

export function TimeJournalStats({
  userId,
  selectedYear,
  selectedMonth,
  selectedClient,
  showUserColumn = false,
  simplifiedView = false
}: TimeJournalStatsProps) {
  // Calculate date range based on filters
  const startDate = useMemo(() => {
    return startOfMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);
  
  const endDate = useMemo(() => {
    return endOfMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);

  // Fetch time entries based on filters
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: [
      "time-entries",
      "journal",
      selectedYear,
      selectedMonth,
      selectedClient,
      userId
    ],
    queryFn: async () => {
      try {
        console.log(`Fetching time entries for ${format(startDate, "MMMM yyyy")}`);
        
        // Base query for time entries
        let query = supabase
          .from("time_entries")
          .select(`
            id, 
            description, 
            start_time, 
            end_time, 
            quantity, 
            created_at,
            user_id, 
            product_id,
            client_id
          `)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
          
        // Apply user filter if provided (or current user if in My Journal)
        if (userId) {
          query = query.eq("user_id", userId);
        }
        
        // Apply client filter if provided
        if (selectedClient) {
          query = query.eq("client_id", selectedClient);
        }
        
        const { data: entries, error } = await query;
        
        if (error) {
          console.error("Error fetching time entries:", error);
          throw error;
        }
        
        console.log(`Found ${entries?.length || 0} time entries`);
        
        // For each entry, fetch the related product and client data
        const enhancedEntries = await Promise.all(
          (entries || []).map(async (entry) => {
            // Fetch product data
            let productData = null;
            if (entry.product_id) {
              const { data: product } = await supabase
                .from("products")
                .select("id, name, type, price")
                .eq("id", entry.product_id)
                .single();
              productData = product;
            }
            
            // Fetch client data
            let clientData = null;
            if (entry.client_id) {
              const { data: client } = await supabase
                .from("clients")
                .select("id, name")
                .eq("id", entry.client_id)
                .single();
              clientData = client;
            }
            
            // Fetch username
            let username = "Unknown";
            if (entry.user_id) {
              try {
                const { data: profileData } = await supabase
                  .from("profiles")
                  .select("name")
                  .eq("id", entry.user_id)
                  .single();
                  
                if (profileData && profileData.name) {
                  username = profileData.name;
                }
              } catch (err) {
                console.error("Error fetching username:", err);
              }
            }
            
            return {
              ...entry,
              products: productData,
              clients: clientData,
              username
            };
          })
        );
        
        return enhancedEntries || [];
      } catch (error) {
        console.error("Error in time entries query:", error);
        return [];
      }
    },
    enabled: true,
  });
  
  // Calculate statistics
  const calculateTotalHours = () => {
    return timeEntries.reduce((total, entry) => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0).toFixed(2);
  };

  const calculateTotalRevenue = () => {
    return formatCurrency(timeEntries.reduce((total, entry) => {
      if (entry.products?.type === 'activity' && entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + (hours * (entry.products.price || 0));
      } else if (entry.products?.type === 'item' && entry.quantity) {
        return total + (entry.quantity * (entry.products.price || 0));
      }
      return total;
    }, 0));
  };
  
  // Prepare table data
  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(2);
  };
  
  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Total Hours</CardTitle>
                <CardDescription>
                  {format(startDate, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                  <div className="rounded-full bg-primary/20 p-2 mr-3">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hours Logged</p>
                    <p className="text-2xl font-bold">{calculateTotalHours()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Entries</CardTitle>
                <CardDescription>
                  {format(startDate, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                  <div className="rounded-full bg-primary/20 p-2 mr-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold">{timeEntries.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>
                {format(startDate, "MMMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {showUserColumn && <TableHead>User</TableHead>}
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration / Qty</TableHead>
                    {!simplifiedView && <TableHead>Revenue</TableHead>}
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showUserColumn ? (simplifiedView ? 6 : 7) : (simplifiedView ? 5 : 6)} className="text-center py-8 text-muted-foreground">
                        No time entries found for the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        {showUserColumn && <TableCell>{entry.username || 'Unknown'}</TableCell>}
                        <TableCell>{entry.clients?.name || 'Unknown client'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.description || (entry.products?.name || 'No description')}
                        </TableCell>
                        <TableCell className="capitalize">
                          {entry.products?.type || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {entry.products?.type === 'activity' && entry.start_time && entry.end_time
                            ? `${calculateDuration(entry.start_time, entry.end_time)} hrs`
                            : entry.quantity ? `${entry.quantity} items` : '-'}
                        </TableCell>
                        {!simplifiedView && (
                          <TableCell>
                            {entry.products?.type === 'activity' && entry.start_time && entry.end_time
                              ? formatCurrency(parseFloat(calculateDuration(entry.start_time, entry.end_time)) * (entry.products.price || 0))
                              : entry.quantity ? formatCurrency(entry.quantity * (entry.products?.price || 0)) : '-'}
                          </TableCell>
                        )}
                        <TableCell>
                          {entry.created_at ? format(new Date(entry.created_at), 'MMM d, yyyy') : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
